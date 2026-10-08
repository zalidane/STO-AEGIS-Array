import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  IMAGE_CACHE_CONTROL,
  WIKI_IMAGE_KINDS,
  contentTypeForFilename,
  extraneousKeys,
  isSkippedImageName,
  md5Hex,
  needsUpload,
  objectKeyFor,
  type ObjectStore,
  type WikiImageKindName,
} from "./imageObjects.js";

const UPLOAD_CONCURRENCY = 4;

export type SkipRecord = {
  path: string;
  reason: string;
};

export type SyncReport = {
  uploaded: string[];
  unchanged: number;
  deleted: string[];
  skipped: SkipRecord[];
  comparedRemote: boolean;
  dryRun: boolean;
  contentTypes: Record<string, number>;
};

type ScannedFile = {
  kind: WikiImageKindName;
  filename: string;
  absolutePath: string;
  size: number;
  contentType: string;
};

type PendingUpload = {
  key: string;
  absolutePath: string;
  contentType: string;
  size: number;
  body: Uint8Array | null;
};

export async function syncWikiImages(options: {
  imagesDir: string;
  store: ObjectStore | null;
  dryRun: boolean;
  deleteExtraneous: boolean;
  cacheControl?: string;
  onUpload?: (key: string) => void;
}): Promise<SyncReport> {
  if (!options.store && !options.dryRun) {
    throw new Error("Object storage client is required unless --dry-run is set.");
  }

  const cacheControl = options.cacheControl ?? IMAGE_CACHE_CONTROL;
  const dirInfo = await stat(options.imagesDir).catch(() => null);
  if (!dirInfo?.isDirectory()) {
    throw new Error(`Image directory not found: ${options.imagesDir}`);
  }

  const scanned = await scanImages(options.imagesDir);
  const contentTypes: Record<string, number> = {};
  for (const file of scanned.files) {
    contentTypes[file.contentType] = (contentTypes[file.contentType] ?? 0) + 1;
  }

  const pending: PendingUpload[] = [];
  let unchanged = 0;
  let deleted: string[] = [];

  if (options.store) {
    const remote = new Map<string, { etag: string | null; size: number | null }>();
    const remoteKeys: string[] = [];
    for (const kind of scanned.presentKinds) {
      const listed = await options.store.list(`${kind}/`);
      for (const object of listed) {
        remote.set(object.key, { etag: object.etag, size: object.size });
        remoteKeys.push(object.key);
      }
    }

    for (const file of scanned.files) {
      const key = objectKeyFor(file.kind, file.filename);
      const head = remote.get(key);
      if (head && head.size === file.size) {
        const body = await readFile(file.absolutePath);
        const local = { md5: md5Hex(body), size: body.byteLength };
        if (!needsUpload(local, head)) {
          unchanged += 1;
          continue;
        }
        pending.push({
          key,
          absolutePath: file.absolutePath,
          contentType: file.contentType,
          size: body.byteLength,
          body,
        });
        continue;
      }
      pending.push({
        key,
        absolutePath: file.absolutePath,
        contentType: file.contentType,
        size: file.size,
        body: null,
      });
    }

    if (options.deleteExtraneous) {
      const localKeys = new Set(
        scanned.files.map((file) => objectKeyFor(file.kind, file.filename)),
      );
      deleted = extraneousKeys(localKeys, remoteKeys);
    }
  } else {
    for (const file of scanned.files) {
      pending.push({
        key: objectKeyFor(file.kind, file.filename),
        absolutePath: file.absolutePath,
        contentType: file.contentType,
        size: file.size,
        body: null,
      });
    }
  }

  pending.sort((a, b) => a.key.localeCompare(b.key));

  if (!options.dryRun && options.store) {
    const store = options.store;
    await mapPool(pending, UPLOAD_CONCURRENCY, async (item) => {
      const body = item.body ?? (await readFile(item.absolutePath));
      try {
        await store.put({
          key: item.key,
          body,
          contentType: item.contentType,
          cacheControl,
          contentLength: body.byteLength,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Upload failed for ${item.key}: ${message}`);
      }
      options.onUpload?.(item.key);
    });

    if (deleted.length > 0) {
      await store.delete(deleted);
    }
  }

  return {
    uploaded: pending.map((item) => item.key),
    unchanged,
    deleted,
    skipped: scanned.skipped,
    comparedRemote: options.store !== null,
    dryRun: options.dryRun,
    contentTypes,
  };
}

async function scanImages(imagesDir: string): Promise<{
  files: ScannedFile[];
  skipped: SkipRecord[];
  presentKinds: WikiImageKindName[];
}> {
  const files: ScannedFile[] = [];
  const skipped: SkipRecord[] = [];
  const presentKinds: WikiImageKindName[] = [];

  const rootEntries = await readdir(imagesDir, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && isSkippedImageName(entry.name)) {
      skipped.push({
        path: entry.name,
        reason: "excluded from object storage",
      });
    }
  }

  for (const kind of WIKI_IMAGE_KINDS) {
    const dir = join(imagesDir, kind);
    const info = await stat(dir).catch(() => null);
    if (!info?.isDirectory()) continue;
    presentKinds.push(kind);

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const path = `${kind}/${entry.name}`;
      if (!entry.isFile()) {
        skipped.push({ path, reason: "not a file" });
        continue;
      }
      if (isSkippedImageName(entry.name)) {
        skipped.push({ path, reason: "excluded from object storage" });
        continue;
      }
      const contentType = contentTypeForFilename(entry.name);
      if (!contentType) {
        skipped.push({ path, reason: "unsupported extension" });
        continue;
      }
      const fileInfo = await stat(join(dir, entry.name));
      if (fileInfo.size <= 0) {
        skipped.push({ path, reason: "empty file" });
        continue;
      }
      files.push({
        kind,
        filename: entry.name,
        absolutePath: join(dir, entry.name),
        size: fileInfo.size,
        contentType,
      });
    }
  }

  return { files, skipped, presentKinds };
}

async function mapPool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const current = next;
        next += 1;
        if (current >= items.length) return;
        const item = items[current];
        if (item === undefined) return;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}
