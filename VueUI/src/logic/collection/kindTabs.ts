import type { CatalogKind } from "./types";

export const COLLECTION_KIND_ORDER: readonly CatalogKind[] = [
  "ship",
  "trait",
  "starshipTrait",
  "item",
];

export const COLLECTION_KIND_LABEL: Record<CatalogKind, string> = {
  ship: "Ships",
  trait: "Traits",
  starshipTrait: "Starship Traits",
  item: "Items",
};

export const COLLECTION_KIND_ICON: Record<CatalogKind, string> = {
  ship: "mdi-ferry",
  trait: "mdi-star-outline",
  starshipTrait: "mdi-star",
  item: "mdi-cube-outline",
};

export type CollectionKindTab<T> = {
  kind: CatalogKind;
  label: string;
  icon: string;
  rows: T[];
};

export function isCollectionKind(value: string): value is CatalogKind {
  return (COLLECTION_KIND_ORDER as readonly string[]).includes(value);
}

export function groupCollectionByKind<T>(
  rows: ReadonlyArray<T>,
  kindOf: (row: T) => CatalogKind,
): Array<CollectionKindTab<T>> {
  return COLLECTION_KIND_ORDER.map((kind) => ({
    kind,
    label: COLLECTION_KIND_LABEL[kind],
    icon: COLLECTION_KIND_ICON[kind],
    rows: rows.filter((row) => kindOf(row) === kind),
  }));
}

/** Keep a requested catalog tab; otherwise Ships. */
export function resolveCollectionTab(
  requested: string | null | undefined,
): CatalogKind {
  if (requested && isCollectionKind(requested)) return requested;
  return "ship";
}

export function collectionKindEmptyCopy(kind: CatalogKind): string {
  return `No ${COLLECTION_KIND_LABEL[kind].toLowerCase()} collected yet.`;
}
