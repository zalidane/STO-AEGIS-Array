import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

/** Apostrophe / quote marks that appear in wiki names and pasted search text. */
const APOSTROPHE_LIKE = /['\u2018\u2019\u02BC\u0060\u00B4]/g;

/**
 * Normalize catalog search text so HTML entities and apostrophe variants match.
 * `Jem'Hadar`, `Jem’Hadar`, `Jem&#039;Hadar`, and `Jemhadar` all fold the same.
 */
export function normalizeCatalogSearchText(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return decodeHtmlEntities(raw)
    .replace(APOSTROPHE_LIKE, "")
    .toLowerCase()
    .trim();
}
