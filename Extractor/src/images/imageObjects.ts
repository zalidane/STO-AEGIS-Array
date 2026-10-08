import { createHash } from "node:crypto";

/** Not `immutable`: wiki filenames stay stable and the bytes can be replaced. */
export const IMAGE_CACHE_CONTROL =
  "public, max-age=2592000, stale-while-revalidate=86400";

export const WIKI_IMAGE_KINDS = [
  "items",
  "ships",
  "traits",
  "starship-traits",
  "tray-skills",
] as const;

export type WikiImageKindName = (typeof WIKI_IMAGE_KINDS)[number];

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

/** Names that must not be uploaded with the wiki image tree. */
const SKIPPED_FILE_NAMES = new Set([
  "notice",
  "ship-placeholder.png",
  "trait-placeholder.png",
  "starship-trait-placeholder.png",
]);

export function contentTypeForFilename(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return null;
  const ext = filename.slice(dot + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? null;
}

export function isSkippedImageName(filename: string): boolean {
  return SKIPPED_FILE_NAMES.has(filename.toLowerCase());
}

export function objectKeyFor(kind: string, filename: string): string {
  return `${kind}/${filename}`;
}

/** Single-part S3/R2 ETags are the MD5. Multipart ETags contain a hyphen. */
export function etagMatchesMd5(
  etag: string | null | undefined,
  md5HexValue: string,
): boolean {
  if (!etag) return false;
  const normalized = etag
    .replace(/^W\//i, "")
    .replaceAll('"', "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized.includes("-")) return false;
  return normalized === md5HexValue.toLowerCase();
}

export function md5Hex(body: Uint8Array): string {
  return createHash("md5").update(body).digest("hex");
}

export type RemoteObjectHead = {
  etag: string | null;
  size: number | null;
};

export function needsUpload(
  local: { md5: string; size: number },
  remote: RemoteObjectHead | undefined,
): boolean {
  if (!remote) return true;
  if (remote.size !== local.size) return true;
  return !etagMatchesMd5(remote.etag, local.md5);
}

export function extraneousKeys(
  localKeys: ReadonlySet<string>,
  remoteKeys: readonly string[],
): string[] {
  return remoteKeys.filter((key) => !localKeys.has(key)).sort();
}

export type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

const REQUIRED_R2_ENV = [
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

/**
 * Read R2/S3 settings from the environment. Error text names missing variables
 * and never includes secret values.
 */
export function readR2Config(env: NodeJS.ProcessEnv): R2Config {
  const values = {
    R2_ENDPOINT: env.R2_ENDPOINT?.trim() ?? "",
    R2_BUCKET: env.R2_BUCKET?.trim() ?? "",
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID?.trim() ?? "",
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY?.trim() ?? "",
  };
  const missing = REQUIRED_R2_ENV.filter((name) => values[name] === "");
  if (missing.length > 0) {
    throw new Error(
      `Missing object-storage settings: ${missing.join(", ")}. Set them in the environment or the repo-root .env file. Do not commit credentials.`,
    );
  }

  const endpoint = values.R2_ENDPOINT.replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error(
      "R2_ENDPOINT must be an absolute URL such as https://<ACCOUNT_ID>.r2.cloudflarestorage.com.",
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("R2_ENDPOINT must use http or https.");
  }

  return {
    endpoint,
    bucket: values.R2_BUCKET,
    accessKeyId: values.R2_ACCESS_KEY_ID,
    secretAccessKey: values.R2_SECRET_ACCESS_KEY,
    region: env.R2_REGION?.trim() || "auto",
  };
}

export type ListedObject = {
  key: string;
  etag: string | null;
  size: number | null;
};

export type PutInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  cacheControl: string;
  contentLength: number;
};

export interface ObjectStore {
  list(prefix: string): Promise<ListedObject[]>;
  put(input: PutInput): Promise<void>;
  delete(keys: string[]): Promise<void>;
}
