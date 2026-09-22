import type { StoNewsFeed } from "./stoNewsRss.js";

type CacheEntry = {
  expiresAtMs: number;
  feed: StoNewsFeed;
};

/**
 * Tiny in-process TTL cache so page views do not hammer Arc on every request.
 * One entry per cache key (feed kind / limit bucket).
 */
export function createTtlCache<T>(defaultTtlMs: number) {
  const store = new Map<string, { expiresAtMs: number; value: T }>();

  return {
    get(key: string, nowMs: number = Date.now()): T | null {
      const hit = store.get(key);
      if (!hit) return null;
      if (hit.expiresAtMs <= nowMs) {
        store.delete(key);
        return null;
      }
      return hit.value;
    },
    set(
      key: string,
      value: T,
      ttlMs: number = defaultTtlMs,
      nowMs: number = Date.now(),
    ): void {
      store.set(key, { expiresAtMs: nowMs + ttlMs, value });
    },
    clear(): void {
      store.clear();
    },
  };
}

export type StoNewsCache = ReturnType<typeof createTtlCache<StoNewsFeed>>;

/** Default: honor typical RSS TTL (~60 minutes) without being too aggressive. */
export const STO_NEWS_CACHE_TTL_MS = 1000 * 60 * 30;

export function createStoNewsCache(
  ttlMs: number = STO_NEWS_CACHE_TTL_MS,
): StoNewsCache {
  return createTtlCache<StoNewsFeed>(ttlMs);
}

/** @internal test helper shape */
export type { CacheEntry };
