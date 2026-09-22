import { GraphQLError } from "graphql";
import {
  createStoNewsCache,
  STO_NEWS_CACHE_TTL_MS,
  type StoNewsCache,
} from "../logic/stoNewsCache.js";
import {
  limitFeedEntries,
  mapArcApiNewsResponse,
  parseStoNewsRss,
  shouldPreferRssFeed,
  STO_NEWS_RSS_URL,
  type StoNewsFeed,
} from "../logic/stoNewsRss.js";

/** Arc Games JSON feed used by the live STO news microsite. */
export const STO_NEWS_ARC_API_BASE_URL =
  "https://api.arcgames.com/v1.0/games/sto/news";

export const STO_NEWS_ARC_API_URL =
  `${STO_NEWS_ARC_API_BASE_URL}?tag=*&limit=40&offset=0&field[]=images.img_microsite_thumbnail&field[]=platforms&field[]=updated`;

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT =
  "STO-AEGIS-Array/1.0 (+https://aegisarray.com; unofficial fan catalog; news proxy)";

export type StoNewsFetchers = {
  fetchRssText: () => Promise<string>;
  fetchArcApiJson: () => Promise<unknown>;
};

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const defaultStoNewsFetchers: StoNewsFetchers = {
  fetchRssText: () => fetchText(STO_NEWS_RSS_URL),
  fetchArcApiJson: () => fetchJson(STO_NEWS_ARC_API_URL),
};

/**
 * Load STO news: prefer the official RSS when it is fresh enough; otherwise
 * fall back to Arc's JSON news API (what the live site uses). Results are
 * cached in-process so Vue page views do not hammer upstream.
 */
export async function loadStoNewsFeed(options?: {
  limit?: number;
  now?: Date;
  cache?: StoNewsCache;
  fetchers?: StoNewsFetchers;
  cacheTtlMs?: number;
}): Promise<StoNewsFeed> {
  const limit = options?.limit ?? 40;
  const now = options?.now ?? new Date();
  const cache = options?.cache;
  const fetchers = options?.fetchers ?? defaultStoNewsFetchers;
  const cacheTtlMs = options?.cacheTtlMs ?? STO_NEWS_CACHE_TTL_MS;
  const cacheKey = `sto-news:v1:${limit}`;

  if (cache) {
    const hit = cache.get(cacheKey, now.getTime());
    if (hit) return hit;
  }

  let feed: StoNewsFeed | null = null;
  let rssError: unknown = null;
  let staleRssFallback: StoNewsFeed | null = null;

  try {
    const xml = await fetchers.fetchRssText();
    const parsed = limitFeedEntries(
      parseStoNewsRss(xml, {
        sourceUrl: STO_NEWS_RSS_URL,
        fetchedAt: now,
      }),
      limit,
    );
    if (shouldPreferRssFeed(parsed, now)) {
      feed = parsed;
    } else {
      staleRssFallback = parsed.entries.length > 0 ? parsed : null;
    }
  } catch (error) {
    rssError = error;
  }

  if (!feed) {
    try {
      const apiJson = await fetchers.fetchArcApiJson();
      feed = limitFeedEntries(
        mapArcApiNewsResponse(apiJson, {
          sourceUrl: STO_NEWS_ARC_API_BASE_URL,
          fetchedAt: now,
          limit,
        }),
        limit,
      );
    } catch (apiError) {
      if (staleRssFallback) {
        feed = staleRssFallback;
      } else {
        const rssMsg =
          rssError instanceof Error ? rssError.message : String(rssError ?? "n/a");
        const apiMsg =
          apiError instanceof Error ? apiError.message : String(apiError);
        throw new GraphQLError(
          `Unable to load Star Trek Online news (RSS: ${rssMsg}; API: ${apiMsg})`,
          { extensions: { code: "STO_NEWS_UNAVAILABLE" } },
        );
      }
    }
  }

  if (!feed || feed.entries.length === 0) {
    throw new GraphQLError("Star Trek Online news feed returned no entries", {
      extensions: { code: "STO_NEWS_EMPTY" },
    });
  }

  if (cache) {
    cache.set(cacheKey, feed, cacheTtlMs, now.getTime());
  }

  return feed;
}

const sharedCache = createStoNewsCache();

export function createStoNewsResolver(options?: {
  cache?: StoNewsCache;
  fetchers?: StoNewsFetchers;
}) {
  const cache = options?.cache ?? sharedCache;
  const fetchers = options?.fetchers;

  return {
    Query: {
      stoNews: async (
        _parent: unknown,
        args: { limit?: number | null },
      ): Promise<{
        title: string;
        sourceUrl: string;
        sourceKind: string;
        fetchedAt: Date;
        entries: Array<{
          id: string;
          title: string;
          link: string;
          publishedAt: Date | null;
          summary: string;
        }>;
      }> => {
        const limit =
          args.limit == null || !Number.isFinite(args.limit)
            ? 40
            : Math.min(100, Math.max(1, Math.floor(args.limit)));
        if (fetchers) {
          return loadStoNewsFeed({ limit, cache, fetchers });
        }
        return loadStoNewsFeed({ limit, cache });
      },
    },
  };
}
