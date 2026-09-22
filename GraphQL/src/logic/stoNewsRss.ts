import { decodeHtmlEntities } from "./decodeHtmlEntities.js";

/** Official Arc Games STO news RSS (site still publishes this feed URL). */
export const STO_NEWS_RSS_URL =
  "https://www.arcgames.com/en/games/star-trek-online/news/rss";

/** Absolute origin used to resolve relative RSS link paths. */
export const STO_NEWS_SITE_ORIGIN = "https://www.arcgames.com";

/** Article pages on the current Arc microsite. */
export const STO_NEWS_ARTICLE_BASE =
  "https://www.arcgames.com/en/news/article";

export type StoNewsEntry = {
  id: string;
  title: string;
  link: string;
  publishedAt: Date | null;
  summary: string;
};

export type StoNewsFeed = {
  title: string;
  sourceUrl: string;
  sourceKind: "rss" | "arc-api";
  fetchedAt: Date;
  entries: StoNewsEntry[];
};

const DEFAULT_SNIPPET_LENGTH = 280;

/**
 * Strip scripts/styles/tags from RSS description HTML and truncate to a snippet.
 */
export function htmlToSnippet(
  raw: string,
  maxLength: number = DEFAULT_SNIPPET_LENGTH,
): string {
  let text = decodeHtmlEntities(raw);
  text = text.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<\/(p|div|li|h[1-6])>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\u00A0/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const clipped =
    lastSpace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return `${clipped.replace(/[.,;:!?\-–—\s]+$/u, "")}…`;
}

export function absolutizeStoNewsUrl(
  href: string,
  baseOrigin: string = STO_NEWS_SITE_ORIGIN,
): string {
  const trimmed = href.trim();
  if (!trimmed) return baseOrigin;
  try {
    return new URL(trimmed, baseOrigin).toString();
  } catch {
    return trimmed;
  }
}

export function parseRssDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

function cdataOrText(block: string, tag: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i",
  ).exec(block);
  if (cdata?.[1] != null) return cdata[1].trim();

  const plain = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,
    "i",
  ).exec(block);
  if (plain?.[1] == null) return "";
  return plain[1].replace(/<[^>]+>/g, "").trim();
}

function firstTagText(block: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(
    block,
  );
  return match?.[1]?.trim() ?? "";
}

function entryIdFromItem(itemXml: string, link: string, title: string): string {
  const guid = firstTagText(itemXml, "guid");
  if (guid) {
    const idMatch = /\/(\d+)(?:\/|$)/.exec(guid) ?? /\b(\d{6,})\b/.exec(guid);
    if (idMatch?.[1]) return idMatch[1];
    return guid;
  }
  const fromLink = /\/(\d+)(?:-|$)/.exec(link);
  if (fromLink?.[1]) return fromLink[1];
  return title || link;
}

/**
 * Parse an RSS 2.0 document into feed metadata + news entries.
 * Pure / side-effect free — suitable for unit tests.
 */
export function parseStoNewsRss(
  xml: string,
  options?: {
    sourceUrl?: string;
    fetchedAt?: Date;
    snippetLength?: number;
  },
): StoNewsFeed {
  const sourceUrl = options?.sourceUrl ?? STO_NEWS_RSS_URL;
  const fetchedAt = options?.fetchedAt ?? new Date();
  const snippetLength = options?.snippetLength ?? DEFAULT_SNIPPET_LENGTH;

  const channelMatch = /<channel\b[^>]*>([\s\S]*?)<\/channel>/i.exec(xml);
  const channelXml = channelMatch?.[1] ?? xml;
  const title = htmlToSnippet(cdataOrText(channelXml, "title"), 120) ||
    "Star Trek Online";

  const itemBlocks = Array.from(
    channelXml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
  );

  const entries: StoNewsEntry[] = [];
  for (const match of itemBlocks) {
    const itemXml = match[1] ?? "";
    const itemTitle = decodeHtmlEntities(cdataOrText(itemXml, "title")).trim();
    const rawLink = cdataOrText(itemXml, "link") || firstTagText(itemXml, "link");
    const link = absolutizeStoNewsUrl(rawLink);
    const description = cdataOrText(itemXml, "description");
    const publishedAt = parseRssDate(firstTagText(itemXml, "pubDate"));
    if (!itemTitle && !link) continue;
    entries.push({
      id: entryIdFromItem(itemXml, link, itemTitle),
      title: itemTitle || "Untitled",
      link,
      publishedAt,
      summary: htmlToSnippet(description, snippetLength),
    });
  }

  return {
    title,
    sourceUrl,
    sourceKind: "rss",
    fetchedAt,
    entries,
  };
}

export function mapArcApiNewsItem(raw: unknown): StoNewsEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id == null ? "" : String(row.id).trim();
  const title =
    typeof row.title === "string" ? decodeHtmlEntities(row.title).trim() : "";
  if (!id && !title) return null;

  const summaryRaw =
    typeof row.summary === "string" ? row.summary : "";
  const updated =
    typeof row.updated === "string"
      ? row.updated
      : typeof row.published === "string"
        ? row.published
        : null;

  // Arc API timestamps look like "2026-09-21 09:00:01" (no TZ; treat as UTC-naive PT-ish wall clock).
  let publishedAt: Date | null = null;
  if (updated) {
    const normalized = updated.includes("T")
      ? updated
      : updated.replace(" ", "T");
    const ms = Date.parse(
      /Z|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`,
    );
    if (!Number.isNaN(ms)) publishedAt = new Date(ms);
  }

  return {
    id: id || title,
    title: title || "Untitled",
    link: `${STO_NEWS_ARTICLE_BASE}/${id || encodeURIComponent(title)}`,
    publishedAt,
    summary: htmlToSnippet(summaryRaw, DEFAULT_SNIPPET_LENGTH),
  };
}

export function mapArcApiNewsResponse(
  payload: unknown,
  options?: {
    sourceUrl?: string;
    fetchedAt?: Date;
    limit?: number;
  },
): StoNewsFeed {
  const sourceUrl =
    options?.sourceUrl ??
    "https://api.arcgames.com/v1.0/games/sto/news";
  const fetchedAt = options?.fetchedAt ?? new Date();
  const limit = options?.limit ?? 40;

  const news =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { news?: unknown }).news)
      ? ((payload as { news: unknown[] }).news)
      : [];

  const entries: StoNewsEntry[] = [];
  for (const item of news) {
    const mapped = mapArcApiNewsItem(item);
    if (mapped) entries.push(mapped);
    if (entries.length >= limit) break;
  }

  return {
    title: "Star Trek Online",
    sourceUrl,
    sourceKind: "arc-api",
    fetchedAt,
    entries,
  };
}

/** Newest pubDate among entries, or null if none parse. */
export function newestEntryDate(entries: StoNewsEntry[]): Date | null {
  let newest: Date | null = null;
  for (const entry of entries) {
    if (!entry.publishedAt) continue;
    if (!newest || entry.publishedAt.getTime() > newest.getTime()) {
      newest = entry.publishedAt;
    }
  }
  return newest;
}

/**
 * Prefer RSS when it has at least one item and its newest entry is within
 * `maxAgeMs`. Otherwise callers should fall back to the Arc JSON news API
 * (what playstartrekonline.com / Arc Games actually renders today).
 */
export function shouldPreferRssFeed(
  feed: StoNewsFeed,
  now: Date = new Date(),
  maxAgeMs: number = 1000 * 60 * 60 * 24 * 21,
): boolean {
  if (feed.sourceKind !== "rss") return false;
  if (feed.entries.length === 0) return false;
  const newest = newestEntryDate(feed.entries);
  if (!newest) return false;
  return now.getTime() - newest.getTime() <= maxAgeMs;
}

export function limitFeedEntries(
  feed: StoNewsFeed,
  limit: number,
): StoNewsFeed {
  const safe = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 40;
  if (feed.entries.length <= safe) return feed;
  return { ...feed, entries: feed.entries.slice(0, safe) };
}
