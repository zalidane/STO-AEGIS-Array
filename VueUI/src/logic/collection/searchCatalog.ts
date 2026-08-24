import type { CatalogKind } from "./types";

const SEARCH_TYPE_TO_KIND: Record<string, CatalogKind> = {
  Ship: "ship",
  Trait: "trait",
  StarshipTrait: "starshipTrait",
  Infobox: "item",
};

export function catalogKindFromSearchType(
  type: string,
): CatalogKind | null {
  return SEARCH_TYPE_TO_KIND[type] ?? null;
}

export function splitHitsByOwnership(
  hits: ReadonlyArray<{ id: number }>,
  ownedIds: ReadonlySet<number>,
): { missingIds: number[]; collectedIds: number[] } {
  const missingIds: number[] = [];
  const collectedIds: number[] = [];
  for (const hit of hits) {
    if (ownedIds.has(hit.id)) collectedIds.push(hit.id);
    else missingIds.push(hit.id);
  }
  return { missingIds, collectedIds };
}
