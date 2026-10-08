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

/**
 * Characters that break public image paths or static hosting.
 * Keep in sync with Extractor `WIKI_UNSAFE_FILENAME_CHARS` (#75).
 */
const WIKI_UNSAFE_FILENAME_CHARS =
  /['\u2018\u2019\u02BC&:/!,\"\u201C\u201D]/g;

export function wikiLocalFilename(fileField: string): string {
  return normalizedFileStem(fileField)
    .replace(WIKI_UNSAFE_FILENAME_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
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

/**
 * Hangar Advanced/Elite pets usually reuse the standard pet’s wiki icon.
 * Keep in sync with Extractor `dropHangarRankPrefix`.
 */
const HANGAR_RANK_PREFIX = /^(Hangar -\s+)(?:Advanced|Elite)\s+/i;

export function dropHangarRankPrefix(name: string): string | undefined {
  const stripped = name.replace(HANGAR_RANK_PREFIX, "$1").replace(/\s+/g, " ").trim();
  return stripped && stripped.toLowerCase() !== name.toLowerCase()
    ? stripped
    : undefined;
}

/**
 * Fleet gear often reuses the base weapon icon when the Fleet-prefixed wiki
 * file is missing. Keep in sync with Extractor `dropFleetItemPrefix`.
 */
const FLEET_ITEM_PREFIX =
  /^(?:Elite Fleet Colony Security|Advanced Fleet|Elite Fleet)\s+/i;

export function dropFleetItemPrefix(name: string): string | undefined {
  const stripped = name.replace(FLEET_ITEM_PREFIX, "").replace(/\s+/g, " ").trim();
  return stripped && stripped.toLowerCase() !== name.toLowerCase()
    ? stripped
    : undefined;
}

/** Wiki item icons omit Mk XII and [Acc]/[Dmg] suffixes from Cargo names. */
export function itemIconLookupName(name: string): string {
  const decoded = normalizedFileStem(name);
  const withoutMods = stripTrailingModsAndInfinity(decoded);
  const withoutMark = withoutMods.replace(ITEM_MARK_SUFFIX, "").trim();
  const hangarBase =
    dropHangarRankPrefix(withoutMark) ?? dropHangarRankPrefix(decoded);
  const fleetBase =
    dropFleetItemPrefix(withoutMark) ?? dropFleetItemPrefix(decoded);
  return hangarBase || fleetBase || withoutMark || withoutMods || decoded;
}

/** encodeURIComponent leaves `'` unescaped; percent-encode it so img src cannot truncate. */
function encodeWikiFilename(filename: string): string {
  return encodeURIComponent(filename).replace(/'/g, "%27");
}

/** Local Vite path used when `VITE_IMAGE_BASE_URL` is unset. */
export const DEFAULT_IMAGE_BASE_URL = "/images";

/**
 * Public base for wiki images. Vite inlines `VITE_IMAGE_BASE_URL` at build time.
 * Empty or unset keeps `/images`, so local dev and unit tests stay on disk.
 */
export function resolveImageBase(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return DEFAULT_IMAGE_BASE_URL;
  return trimmed.replace(/\/+$/, "");
}

const imageBase = resolveImageBase(import.meta.env.VITE_IMAGE_BASE_URL);

/** `{base}/{kind}/{filename}` with filename percent-encoding. */
export function wikiImagePublicUrl(
  kind: WikiImageKind,
  filename: string,
  base: string = imageBase,
): string {
  return `${resolveImageBase(base)}/${kind}/${encodeWikiFilename(filename)}`;
}

function wikiPublicUrl(kind: WikiImageKind, filename: string): string {
  return wikiImagePublicUrl(kind, filename);
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
