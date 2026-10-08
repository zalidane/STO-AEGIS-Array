import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { ListedObject, ObjectStore, PutInput, R2Config } from "./imageObjects.js";

const DELETE_BATCH = 1000;

/**
 * R2 rejects the default CRC32 checksum headers from recent AWS SDKs.
 * `WHEN_REQUIRED` sends a checksum only when the operation requires one.
 */
export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function createR2ObjectStore(
  config: R2Config,
  client: S3Client = createR2Client(config),
): ObjectStore {
  return {
    async list(prefix: string): Promise<ListedObject[]> {
      const listed: ListedObject[] = [];
      let continuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ...(continuationToken
              ? { ContinuationToken: continuationToken }
              : {}),
          }),
        );
        for (const object of page.Contents ?? []) {
          if (!object.Key || object.Key.endsWith("/")) continue;
          listed.push({
            key: object.Key,
            etag: object.ETag ?? null,
            size: object.Size ?? null,
          });
        }
        continuationToken = page.IsTruncated
          ? page.NextContinuationToken
          : undefined;
      } while (continuationToken);
      return listed;
    },

    async put(input: PutInput): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl,
          ContentLength: input.contentLength,
        }),
      );
    },

    async delete(keys: string[]): Promise<void> {
      for (let start = 0; start < keys.length; start += DELETE_BATCH) {
        const batch = keys.slice(start, start + DELETE_BATCH);
        if (batch.length === 0) continue;
        const result = await client.send(
          new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: {
              Objects: batch.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        const errors = result.Errors ?? [];
        const first = errors[0];
        if (first) {
          throw new Error(
            `Failed to delete ${errors.length} object(s). First key: ${first.Key ?? "(unknown)"} ${first.Message ?? ""}`.trim(),
          );
        }
      }
    },
  };
}
