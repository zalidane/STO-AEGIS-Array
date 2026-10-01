import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";

const INVISIBLE_CHARS = /[\u200e\u200f\u200b\ufeff]/g;

export type ImageKind = "items" | "ships" | "traits" | "starship-traits" | "tray-skills";

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
 * Wiki ability files omit `:` (`Beams: Fire at Will` → `Beams Fire at Will`).
 * Keep in sync with VueUI `traySkillIconLookupName`.
 */
export function abilityIconStem(name: string): string {
  const decoded = decodeHtmlEntities(name).replace(INVISIBLE_CHARS, "").trim();
  return decoded.replace(/:/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Federation first ({{abilityicon}} default), then the factionless AoY file.
 */
export function traySkillIconFileTitles(name: string): string[] {
  const stem = abilityIconStem(name);
  if (!stem) return [];
  return uniqueNames([
    `File:${stem} icon (Federation).png`,
    `File:${stem} icon.png`,
  ]);
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

/**
 * Hangar Advanced/Elite pets usually reuse the standard pet’s wiki icon.
 * Keep the full name first so a distinct Advanced/Elite file still wins.
 */
const HANGAR_RANK_PREFIX = /^(Hangar -\s+)(?:Advanced|Elite)\s+/i;

export function dropHangarRankPrefix(name: string): string | undefined {
  const stripped = name.replace(HANGAR_RANK_PREFIX, "$1").replace(/\s+/g, " ").trim();
  return stripped && stripped.toLowerCase() !== name.toLowerCase()
    ? stripped
    : undefined;
}

/**
 * Fleet gear often reuses the base weapon’s wiki icon when the
 * `Advanced Fleet …` / `Elite Fleet …` file title is missing on the wiki.
 * Longer prefixes first. Keep in sync with VueUI `dropFleetItemPrefix`.
 */
const FLEET_ITEM_PREFIX =
  /^(?:Elite Fleet Colony Security|Advanced Fleet|Elite Fleet)\s+/i;

export function dropFleetItemPrefix(name: string): string | undefined {
  const stripped = name.replace(FLEET_ITEM_PREFIX, "").replace(/\s+/g, " ").trim();
  return stripped && stripped.toLowerCase() !== name.toLowerCase()
    ? stripped
    : undefined;
}

/** Exact cargo name, then without mods, then without Mk — first wiki hit wins. */
export function itemIconNameCandidates(name: string): string[] {
  const decoded = decodeHtmlEntities(name).replace(INVISIBLE_CHARS, "").trim();
  const withoutMods = stripTrailingModsAndInfinity(decoded);
  const withoutMark = withoutMods.replace(ITEM_MARK_SUFFIX, "").trim();
  const hangarBase =
    dropHangarRankPrefix(withoutMark) ?? dropHangarRankPrefix(decoded);
  const fleetBase =
    dropFleetItemPrefix(withoutMark) ?? dropFleetItemPrefix(decoded);
  return uniqueNames([
    decoded,
    withoutMods,
    withoutMark,
    hangarBase ?? "",
    fleetBase ?? "",
  ]);
}

/**
 * Characters that break public image paths or static hosting.
 * Strip so Extractor writes and VueUI lookups stay POSIX/WAF/URL-safe.
 * Includes apostrophes/ampersands (legacy) plus `:`, `/`, `!`, `,`, and quotes (#75/#77).
 */
export const WIKI_UNSAFE_FILENAME_CHARS =
  /['\u2018\u2019\u02BC&:/!,\"\u201C\u201D]/g;

/** @deprecated Use WIKI_UNSAFE_FILENAME_CHARS */
export const WIKI_APOSTROPHES = WIKI_UNSAFE_FILENAME_CHARS;

export function stripWikiUnsafeFilenameChars(name: string): string {
  return name.replace(WIKI_UNSAFE_FILENAME_CHARS, "");
}

/** @deprecated Use stripWikiUnsafeFilenameChars */
export function stripWikiApostrophes(name: string): string {
  return stripWikiUnsafeFilenameChars(name);
}

/** Case-insensitive key that also ignores unsafe chars still present on disk. */
export function imageFileMatchKey(filename: string): string {
  return stripWikiUnsafeFilenameChars(filename).toLowerCase();
}

export function localFilename(fileTitle: string): string {
  const stem = stripWikiUnsafeFilenameChars(
    normalizeWikiFileTitle(fileTitle).replace(/^File:/i, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
  return stem.replaceAll(" ", "_");
}

export function matchKey(fileTitle: string): string {
  return localFilename(fileTitle).toLowerCase();
}

export function localRelativePath(kind: ImageKind, fileTitle: string): string {
  return `${kind}/${localFilename(fileTitle)}`;
}
