import { DISCLAIMER } from "@/logic/attribution";

export const NEWS_PAGE_TITLE = "News";

export const NEWS_PAGE_LEDE =
  "Headlines from the official Star Trek Online news feed, listed here for captains who want a quick scan without leaving the catalog.";

export const NEWS_SOURCE_NOTE =
  "Titles and summaries come from the official Star Trek Online news feed. This page is an unofficial mirror for convenience — not affiliated with or endorsed by Paramount, Cryptic, DECA, or Arc Games.";

export const NEWS_OFFICIAL_INDEX_URL =
  "https://www.playstartrekonline.com/en/news";

export const NEWS_OFFICIAL_INDEX_LABEL = "Official Star Trek Online news";

export const NEWS_READ_MORE_LABEL = "Read on Star Trek Online news page";

export function newsSourceKindLabel(kind: string | null | undefined): string {
  if (kind === "rss") return "Official STO news RSS";
  if (kind === "arc-api") return "Official STO news API";
  return "Official STO news";
}

export function formatNewsPublishedAt(
  value: string | Date | null | undefined | unknown,
): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string" && !(value instanceof Date)) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export { DISCLAIMER as NEWS_DISCLAIMER };
