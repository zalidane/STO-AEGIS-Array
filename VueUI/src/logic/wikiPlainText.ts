import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

/** Turn wiki/HTML line breaks into real newlines, then drop leftover tags. */
export function normalizeWikiPlainText(raw: string): string {
  let value = decodeHtmlEntities(raw);
  value = value.replace(/<br\s*\/?>/gi, "\n");
  value = value.replace(/<hr\s*\/?>/gi, "\n");
  value = value.replace(/<[^>]+>/g, "");
  return value;
}
