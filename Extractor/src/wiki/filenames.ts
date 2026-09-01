import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";

const INVISIBLE_CHARS = /[\u200e\u200f\u200b\ufeff]/g;

export type ImageKind = "items" | "ships" | "traits" | "starship-traits";

export type ImageTarget = {
  kind: ImageKind;
  wikiTitle: string;
  localFilename: string;
};

/** Decode wiki/HTML noise and return a canonical `File:Name with spaces.ext` title. */
export function normalizeWikiFileTitle(raw: string): string {
  const decoded = decodeHtmlEntities(raw).replace(INVISIBLE_CHARS, "").trim();
  const withoutPrefix = decoded.replace(/^File:/i, "").trim();
  const withSpaces = withoutPrefix.replaceAll("_", " ").replace(/\s+/g, " ").trim();
  return `File:${withSpaces}`;
}

export function iconFileTitle(nameOrFile: string): string {
  const title = normalizeWikiFileTitle(nameOrFile).replace(/^File:/i, "");
  if (/\sicon\.[a-z0-9]+$/i.test(title) || /icon\.[a-z0-9]+$/i.test(title)) {
    return `File:${title}`;
  }
  return `File:${title} icon.png`;
}

/**
 * Cargo item names often include Mk XII and [Acc]/[Dmg]x2 suffixes.
 * Wiki icons almost always omit those; keep the full name as the first lookup.
 */
const ITEM_MOD_SUFFIX = /(?:\s*\[[^\]]+\](?:x\d+)?)+\s*$/i;
const ITEM_MARK_SUFFIX =
  /\s+(?:Mk|Mark)\s*(?:∞|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|\d+)\s*$/i;

function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const stems: string[] = [];
  for (const name of names) {
    const trimmed = name.replace(/\s+/g, " ").trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    stems.push(trimmed);
  }
  return stems;
}

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

/** Exact cargo name, then without mods, then without Mk — first wiki hit wins. */
export function itemIconNameCandidates(name: string): string[] {
  const decoded = decodeHtmlEntities(name).replace(INVISIBLE_CHARS, "").trim();
  const withoutMods = stripTrailingModsAndInfinity(decoded);
  const withoutMark = withoutMods.replace(ITEM_MARK_SUFFIX, "").trim();
  return uniqueNames([decoded, withoutMods, withoutMark]);
}

/** ASCII and Unicode apostrophes. Strip them so public paths stay POSIX/WAF-safe. */
export const WIKI_APOSTROPHES = /['\u2018\u2019\u02BC]/g;

export function stripWikiApostrophes(name: string): string {
  return name.replace(WIKI_APOSTROPHES, "");
}

/** Case-insensitive key that also ignores apostrophes still present on disk. */
export function imageFileMatchKey(filename: string): string {
  return stripWikiApostrophes(filename).toLowerCase();
}

export function localFilename(fileTitle: string): string {
  return stripWikiApostrophes(
    normalizeWikiFileTitle(fileTitle)
      .replace(/^File:/i, "")
      .replaceAll(" ", "_"),
  );
}

export function matchKey(fileTitle: string): string {
  return localFilename(fileTitle).toLowerCase();
}

export function localRelativePath(kind: ImageKind, fileTitle: string): string {
  return `${kind}/${localFilename(fileTitle)}`;
}
