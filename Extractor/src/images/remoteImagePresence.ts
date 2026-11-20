import { objectKeyFor, type ObjectStore } from "./imageObjects.js";

/**
 * Which images the public image host (R2 behind VITE_IMAGE_BASE_URL) already
 * serves. The incremental wiki image extract uses this so a machine with an
 * empty `VueUI/public/images/` does not re-download thousands of files that
 * already live in object storage.
 *
 * Modes, best first:
 * - `r2`    list the bucket with the images:sync R2 credentials (cheap, exact)
 * - `http`  HEAD each candidate under the public image base URL
 * - `index` no remote access configured: trust the committed imageIndex.json
 */
export type RemoteCheckMode = "r2" | "http" | "index";

export type RemoteImageCandidate = { kind: string; localFilename: string };

export type RemoteImagePresence = {
  mode: RemoteCheckMode;
  /** `true` = on the host (or trusted), `false` = checked and absent. */
  has(kind: string, localFilename: string): boolean;
  summary: string;
};

type FetchLike = (
  url: string,
  init: { method: string; signal?: AbortSignal },
) => Promise<{ status: number }>;

const DEFAULT_HTTP_CONCURRENCY = 16;
const HTTP_TIMEOUT_MS = 15_000;
const ABSENT_STATUSES = new Set([403, 404, 410]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Matches VueUI `wikiImagePublicUrl`: encodeURIComponent plus `'` → %27. */
export function publicImageUrl(
  baseUrl: string,
  kind: string,
  localFilename: string,
): string {
  const base = baseUrl.trim().replace(/\/+$/, "");
  const file = encodeURIComponent(localFilename).replace(/'/g, "%27");
  return `${base}/${kind}/${file}`;
}

export function resolveImageBaseUrl(
  explicit: string | null | undefined,
  env: NodeJS.ProcessEnv,
): string | null {
  for (const value of [explicit, env.IMAGE_BASE_URL, env.VITE_IMAGE_BASE_URL]) {
    const trimmed = value?.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  }
  return null;
}

export async function listRemoteKeys(
  store: ObjectStore,
  kinds: Iterable<string>,
): Promise<Set<string>> {
  const keys = new Set<string>();
  for (const kind of new Set(kinds)) {
    for (const object of await store.list(`${kind}/`)) keys.add(object.key);
  }
  return keys;
}

export async function headRemoteKeys(
  baseUrl: string,
  candidates: readonly RemoteImageCandidate[],
  options: {
    fetchImpl?: FetchLike;
    concurrency?: number;
    retries?: number;
    retryDelayMs?: number;
  } = {},
): Promise<{
  present: Set<string>;
  absent: Set<string>;
  unknown: number;
  unknownStatuses: Record<string, number>;
}> {
  const fetchImpl: FetchLike =
    options.fetchImpl ?? ((url, init) => fetch(url, init));
  const present = new Set<string>();
  const absent = new Set<string>();
  let unknown = 0;
  const unknownStatuses: Record<string, number> = {};
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 1_000;
  let next = 0;
  const limit = Math.max(1, options.concurrency ?? DEFAULT_HTTP_CONCURRENCY);
  const worker = async () => {
    for (;;) {
      const current = next;
      next += 1;
      const candidate = candidates[current];
      if (!candidate) return;
      const key = objectKeyFor(candidate.kind, candidate.localFilename);
      const url = publicImageUrl(baseUrl, candidate.kind, candidate.localFilename);
      let outcome: "present" | "absent" | string = "error";
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        if (attempt > 0) await sleep(retryDelayMs * attempt);
        try {
          const response = await fetchImpl(url, {
            method: "HEAD",
            signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
          });
          if (response.status >= 200 && response.status < 300) outcome = "present";
          else if (ABSENT_STATUSES.has(response.status)) outcome = "absent";
          else outcome = String(response.status);
        } catch {
          outcome = "error";
        }
        // Only throttling / server errors / network failures are worth a retry.
        if (outcome === "present" || outcome === "absent") break;
      }
      if (outcome === "present") present.add(key);
      else if (outcome === "absent") absent.add(key);
      else {
        unknown += 1;
        unknownStatuses[outcome] = (unknownStatuses[outcome] ?? 0) + 1;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, candidates.length) }, worker),
  );
  return { present, absent, unknown, unknownStatuses };
}

/**
 * Build the presence check. Transient HTTP errors count as present (trust the
 * committed index) so a flaky CDN never turns into thousands of wiki requests.
 */
export async function buildRemoteImagePresence(options: {
  candidates: readonly RemoteImageCandidate[];
  store?: ObjectStore | null;
  baseUrl?: string | null;
  fetchImpl?: FetchLike;
  concurrency?: number;
  retryDelayMs?: number;
  log?: (message: string) => void;
}): Promise<RemoteImagePresence> {
  const log = options.log ?? (() => {});

  if (options.store) {
    try {
      const keys = await listRemoteKeys(
        options.store,
        options.candidates.map((row) => row.kind),
      );
      return {
        mode: "r2",
        has: (kind, file) => keys.has(objectKeyFor(kind, file)),
        summary: `listed ${keys.size} objects in R2`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Images: R2 list failed (${message}); falling back`);
    }
  }

  if (options.baseUrl && options.candidates.length > 0) {
    const result = await headRemoteKeys(options.baseUrl, options.candidates, {
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      ...(options.concurrency ? { concurrency: options.concurrency } : {}),
      ...(options.retryDelayMs != null ? { retryDelayMs: options.retryDelayMs } : {}),
    });
    return {
      mode: "http",
      has: (kind, file) => !result.absent.has(objectKeyFor(kind, file)),
      summary: `HEAD ${options.candidates.length} under ${options.baseUrl}: ${result.present.size} present, ${result.absent.size} absent, ${result.unknown} unknown (trusted${
        result.unknown > 0 ? `: ${JSON.stringify(result.unknownStatuses)}` : ""
      })`,
    };
  }

  return {
    mode: "index",
    has: () => true,
    summary:
      "no R2 credentials or image base URL; trusting imageIndex.json rows marked exists/downloaded",
  };
}
