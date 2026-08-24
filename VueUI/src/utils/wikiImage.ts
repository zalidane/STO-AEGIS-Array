/** Shared wiki filename → local public path rules. Keep in sync with Extractor/src/wiki/filenames.ts */

const INVISIBLE_CHARS = /[\u200e\u200f\u200b\ufeff]/g;

export type WikiImageKind = "items" | "ships" | "traits" | "starship-traits";

export function wikiLocalFilename(fileField: string): string {
  return fileField
    .replace(INVISIBLE_CHARS, "")
    .replace(/^File:/i, "")
    .trim()
    .replace(/ /g, "_");
}

export function wikiIconFilename(nameOrFile: string): string {
  const stripped = nameOrFile
    .replace(INVISIBLE_CHARS, "")
    .replace(/^File:/i, "")
    .trim();
  if (/\sicon\.[a-z0-9]+$/i.test(stripped) || /icon\.[a-z0-9]+$/i.test(stripped)) {
    return wikiLocalFilename(stripped);
  }
  return wikiLocalFilename(`${stripped} icon.png`);
}

export function getWikiImageUrl(
  kind: WikiImageKind,
  fileField: string | null | undefined,
  fallback: string,
): string {
  if (!fileField?.trim()) return fallback;
  return `/images/${kind}/${wikiLocalFilename(fileField)}`;
}

export function getItemImageUrl(
  image: string | null | undefined,
  name?: string | null,
): string | null {
  if (image?.trim()) {
    return `/images/items/${wikiLocalFilename(image)}`;
  }
  if (name?.trim()) {
    return `/images/items/${wikiIconFilename(name)}`;
  }
  return null;
}

export function getTraitImageUrl(
  name: string | null | undefined,
  iconName?: string | null,
): string | null {
  const stem = iconName?.trim() || name?.trim();
  if (!stem) return null;
  return `/images/traits/${wikiIconFilename(stem)}`;
}

export function getStarshipTraitImageUrl(
  name: string | null | undefined,
  iconName?: string | null,
): string | null {
  const stem = iconName?.trim() || name?.trim();
  if (!stem) return null;
  return `/images/starship-traits/${wikiIconFilename(stem)}`;
}
