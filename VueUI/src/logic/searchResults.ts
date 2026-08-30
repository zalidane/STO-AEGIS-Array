export const SEARCH_TAB_ORDER = [
  "Ship",
  "Infobox",
  "Trait",
  "StarshipTrait",
  "TraySkill",
  "Reputation",
  "SetBonus",
] as const;

export type SearchTabType = (typeof SEARCH_TAB_ORDER)[number];

const TAB_TYPES = new Set<string>(SEARCH_TAB_ORDER);

export function isSearchTabType(type: string): type is SearchTabType {
  return TAB_TYPES.has(type);
}

export type SearchHit = {
  type: string;
  name: string;
  id: number;
};

export type SearchHitBucket = {
  type: SearchTabType;
  hits: SearchHit[];
};

/** Group search hits into non-empty tabs, in a stable category order. */
export function bucketSearchHits(
  hits: ReadonlyArray<SearchHit>,
): SearchHitBucket[] {
  const groups = new Map<SearchTabType, SearchHit[]>();

  for (const hit of hits) {
    if (!isSearchTabType(hit.type)) continue;
    const bucket = groups.get(hit.type) ?? [];
    if (!bucket.some((existing) => existing.id === hit.id)) {
      bucket.push(hit);
    }
    groups.set(hit.type, bucket);
  }

  return SEARCH_TAB_ORDER.flatMap((type) => {
    const bucket = groups.get(type);
    return bucket?.length ? [{ type, hits: bucket }] : [];
  });
}

/** Keep the requested tab when it still has hits; otherwise the first tab. */
export function resolveSearchTab(
  availableTypes: readonly string[],
  requested: string | null | undefined,
): string | null {
  if (requested && availableTypes.includes(requested)) return requested;
  return availableTypes[0] ?? null;
}
