/** Shared wiki filename → local public path rules. Keep in sync with Extractor/src/wiki/filenames.ts */

import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

const INVISIBLE_CHARS = /[\u200e\u200f\u200b\ufeff]/g;

export type WikiImageKind = "items" | "ships" | "traits" | "starship-traits";

/** Decode wiki/HTML noise and return a canonical `Name with spaces.ext` stem. */
function normalizedFileStem(raw: string): string {
  const decoded = decodeHtmlEntities(raw).replace(INVISIBLE_CHARS, "").trim();
  const withoutPrefix = decoded.replace(/^File:/i, "").trim();
  return withoutPrefix.replaceAll("_", " ").replace(/\s+/g, " ").trim();
}

export function wikiLocalFilename(fileField: string): string {
  return normalizedFileStem(fileField).replaceAll(" ", "_");
}

export function wikiIconFilename(nameOrFile: string): string {
  const title = normalizedFileStem(nameOrFile);
  if (/\sicon\.[a-z0-9]+$/i.test(title) || /icon\.[a-z0-9]+$/i.test(title)) {
    return wikiLocalFilename(title);
  }
  return wikiLocalFilename(`${title} icon.png`);
}

/** encodeURIComponent leaves `'` unescaped; percent-encode it so img src cannot truncate. */
function encodeWikiFilename(filename: string): string {
  return encodeURIComponent(filename).replaceAll("'", "%27");
}

function wikiPublicUrl(kind: WikiImageKind, filename: string): string {
  return `/images/${kind}/${encodeWikiFilename(filename)}`;
}

export function getWikiImageUrl(
  kind: WikiImageKind,
  fileField: string | null | undefined,
  fallback: string,
): string {
  if (!fileField?.trim()) return fallback;
  return wikiPublicUrl(kind, wikiLocalFilename(fileField));
}

export function getItemImageUrl(
  image: string | null | undefined,
  name?: string | null,
): string | null {
  if (image?.trim()) {
    return wikiPublicUrl("items", wikiLocalFilename(image));
  }
  if (name?.trim()) {
    return wikiPublicUrl("items", wikiIconFilename(name));
  }
  return null;
}

export function getTraitImageUrl(
  name: string | null | undefined,
  iconName?: string | null,
): string | null {
  const stem = iconName?.trim() || name?.trim();
  if (!stem) return null;
  return wikiPublicUrl("traits", wikiIconFilename(stem));
}

export function getStarshipTraitImageUrl(
  name: string | null | undefined,
  iconName?: string | null,
): string | null {
  const stem = iconName?.trim() || name?.trim();
  if (!stem) return null;
  return wikiPublicUrl("starship-traits", wikiIconFilename(stem));
}
