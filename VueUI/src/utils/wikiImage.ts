/** Shared wiki filename → local public path rules. Keep in sync with Extractor/src/wiki/filenames.ts */

import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

const INVISIBLE_CHARS = /[\u200e\u200f\u200b\ufeff]/g;

export type WikiImageKind = "items" | "ships" | "traits" | "starship-traits" | "tray-skills";

/** Decode wiki/HTML noise and return a canonical `Name with spaces.ext` stem. */
function normalizedFileStem(raw: string): string {
  const decoded = decodeHtmlEntities(raw).replace(INVISIBLE_CHARS, "").trim();
  const withoutPrefix = decoded.replace(/^File:/i, "").trim();
  return withoutPrefix.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/** ASCII/Unicode apostrophes and ampersands — strip so hosted Linux/WAF/URL paths do not 404. */
const WIKI_APOSTROPHES = /['\u2018\u2019\u02BC&]/g;

export function wikiLocalFilename(fileField: string): string {
  return normalizedFileStem(fileField).replace(/ /g, "_").replace(WIKI_APOSTROPHES, "");
}

export function wikiIconFilename(nameOrFile: string): string {
  const title = normalizedFileStem(nameOrFile);
  if (/\sicon\.[a-z0-9]+$/i.test(title) || /icon\.[a-z0-9]+$/i.test(title)) {
    return wikiLocalFilename(title);
  }
  return wikiLocalFilename(`${title} icon.png`);
}

/** Keep in sync with Extractor `itemIconNameCandidates`. */
const ITEM_MOD_SUFFIX = /(?:\s*\[[^\]]+\](?:x\d+)?)+\s*$/i;
const ITEM_MARK_SUFFIX =
  /\s+(?:Mk|Mark)\s*(?:∞|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d+)\s*$/i;

function stripTrailingModsAndInfinity(name: string): string {
  let current = name.trim();
  for (;;) {
    const next = current
      .replace(ITEM_MOD_SUFFIX, "")
      .replace(/\s*∞\s*$/u, "")
      .trim();
    if (next === current) return current;
    current = next;
  }
}

/** Wiki item icons omit Mk XII and [Acc]/[Dmg] suffixes from Cargo names. */
export function itemIconLookupName(name: string): string {
  const decoded = normalizedFileStem(name);
  const withoutMods = stripTrailingModsAndInfinity(decoded);
  const withoutMark = withoutMods.replace(ITEM_MARK_SUFFIX, "").trim();
  return withoutMark || withoutMods || decoded;
}

/** encodeURIComponent leaves `'` unescaped; percent-encode it so img src cannot truncate. */
function encodeWikiFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/'/g, "%27");
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
    return wikiPublicUrl("items", wikiIconFilename(itemIconLookupName(name)));
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

/** Keep in sync with Extractor `abilityIconStem`. */
export function traySkillIconLookupName(name: string): string {
  const decoded = normalizedFileStem(name);
  return decoded.replace(/:/g, "").replace(/\s+/g, " ").trim();
}

export function getTraySkillImageUrl(
  name: string | null | undefined,
  storedFilename?: string | null,
): string | null {
  if (storedFilename?.trim()) {
    return wikiPublicUrl("tray-skills", wikiLocalFilename(storedFilename));
  }
  const stem = name?.trim() ? traySkillIconLookupName(name) : "";
  if (!stem) return null;
  return wikiPublicUrl(
    "tray-skills",
    wikiLocalFilename(`${stem} icon (Federation).png`),
  );
}
