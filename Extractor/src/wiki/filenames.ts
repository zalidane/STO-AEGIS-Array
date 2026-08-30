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
