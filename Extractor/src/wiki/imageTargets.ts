import {
  iconFileTitle,
  itemIconNameCandidates,
  localFilename,
  matchKey,
  normalizeWikiFileTitle,
  type ImageKind,
  type ImageTarget,
} from "./filenames";

export type CatalogImageSource = {
  ships?: ReadonlyArray<{ image?: string | null; image2?: string | null }>;
  traits?: ReadonlyArray<{ name?: string | null; ["icon name"]?: string | null }>;
  starshipTraits?: ReadonlyArray<{ name?: string | null; ["icon name"]?: string | null }>;
  infoboxes?: ReadonlyArray<{ name: string; image?: string | null }>;
};

export function catalogImageTargets(source: CatalogImageSource): ImageTarget[] {
  const byKey = new Map<string, ImageTarget>();

  const add = (kind: ImageKind, rawTitle: string | null | undefined) => {
    if (!rawTitle?.trim()) return;
    const wikiTitle =
      kind === "ships" ? normalizeWikiFileTitle(rawTitle) : iconFileTitle(rawTitle);
    const key = `${kind}:${matchKey(wikiTitle)}`;
    if (byKey.has(key)) return;
    byKey.set(key, {
      kind,
      wikiTitle,
      localFilename: localFilename(wikiTitle),
    });
  };

  for (const ship of source.ships ?? []) {
    add("ships", ship.image);
    add("ships", ship.image2);
  }
  for (const trait of source.traits ?? []) {
    add("traits", trait["icon name"] || trait.name);
  }
  for (const trait of source.starshipTraits ?? []) {
    add("starship-traits", trait["icon name"] || trait.name);
  }
  for (const item of source.infoboxes ?? []) {
    for (const stem of itemIconNameCandidates(item.name)) {
      add("items", stem);
    }
  }

  return [...byKey.values()];
}

const PRESENT_STATUSES = new Set(["downloaded", "exists"]);

export type CatalogImageIndexRow = {
  kind: ImageKind;
  wikiTitle: string;
  localFilename: string;
  status: string;
};

/**
 * Attach resolved local filenames onto infobox rows after a successful image extract.
 * Missing wiki files stay `null` so the UI does not guess a 404 path.
 */
export function applyImageIndexToInfoboxes<T extends { name: string }>(
  infoboxes: readonly T[],
  index: readonly CatalogImageIndexRow[],
): Array<T & { image: string | null }> {
  const byKey = new Map<string, string>();
  for (const row of index) {
    if (row.kind !== "items") continue;
    if (!PRESENT_STATUSES.has(row.status)) continue;
    byKey.set(matchKey(row.wikiTitle), row.localFilename);
  }

  return infoboxes.map((item) => {
    const filename =
      itemIconNameCandidates(item.name)
        .map((stem) => byKey.get(matchKey(iconFileTitle(stem))))
        .find((hit) => hit != null) ?? null;
    return { ...item, image: filename };
  });
}
