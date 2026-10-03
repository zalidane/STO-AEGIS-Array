import {
  displayTraitEnvironment,
  displayTraitType,
} from "@/logic/traitBrowser";

/** Facet value used when a catalog row has no type or region. */
export const UNSPECIFIED_FACET = "__unspecified__";

export type CatalogFacetField = "type" | "environment";

export type CatalogFacetItem = {
  type: string | null;
  environment: string | null;
};

export function facetKey(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed || UNSPECIFIED_FACET;
}

export function facetLabel(
  field: CatalogFacetField,
  key: string | null | undefined,
): string {
  if (!key || key === UNSPECIFIED_FACET) return "Unspecified";
  if (field === "type") return displayTraitType(key) ?? key;
  return displayTraitEnvironment(key) ?? key;
}

export function listFacetKeys(
  items: readonly CatalogFacetItem[],
  field: CatalogFacetField,
): string[] {
  const present = new Set<string>();
  for (const item of items) {
    present.add(facetKey(item[field]));
  }
  return [...present].sort((left, right) => {
    if (left === UNSPECIFIED_FACET) return 1;
    if (right === UNSPECIFIED_FACET) return -1;
    return facetLabel(field, left).localeCompare(facetLabel(field, right), undefined, {
      sensitivity: "base",
    });
  });
}

export function countFacetMatches(
  items: readonly CatalogFacetItem[],
  facets: { type?: string | null; environment?: string | null },
): number {
  return items.filter((item) => {
    if (facets.type != null && facetKey(item.type) !== facets.type) return false;
    if (
      facets.environment != null &&
      facetKey(item.environment) !== facets.environment
    ) {
      return false;
    }
    return true;
  }).length;
}

/** Prefer a region that actually has rows for the selected type. */
export function defaultRegionKey(
  items: readonly CatalogFacetItem[],
  typeKey: string | null,
  regionKeys: readonly string[],
): string | null {
  if (regionKeys.length === 0) return null;
  if (typeKey == null) return regionKeys[0] ?? null;
  for (const region of regionKeys) {
    if (countFacetMatches(items, { type: typeKey, environment: region }) > 0) {
      return region;
    }
  }
  return regionKeys[0] ?? null;
}

export function catalogTabEmptyMessage(input: {
  noun: string;
  searching: boolean;
  typeLabel?: string | null;
  regionLabel?: string | null;
}): string {
  if (input.searching) {
    return "No results match the current search and filters.";
  }
  if (input.typeLabel && input.regionLabel) {
    return `No ${input.noun} in ${input.typeLabel} · ${input.regionLabel}.`;
  }
  if (input.typeLabel) {
    return `No ${input.noun} of type ${input.typeLabel}.`;
  }
  return `No ${input.noun} to show.`;
}
