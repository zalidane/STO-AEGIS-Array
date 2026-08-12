import { getSearchResultRoute } from "@/mappers/searchResultRoutes";
import type { RouteLocationRaw } from "vue-router";

export type ObtainedLinkTarget = {
  type: string;
  id: number;
  name: string;
};

export type ObtainedLinkCatalog = {
  /** Case-insensitive name → ship id (resolved display names). */
  shipsByName: Map<string, number>;
  /** Case-insensitive name → infobox id. */
  infoboxesByName?: Map<string, number>;
  /** Optional exact-name search hits for other entity types. */
  searchHitsByName?: Map<string, ObtainedLinkTarget>;
};

export function normalizeLookupKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildNameIdMap(
  entries: ReadonlyArray<{ id: number; name: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const key = normalizeLookupKey(entry.name);
    if (key && !map.has(key)) map.set(key, entry.id);
  }
  return map;
}

/**
 * Resolve a wiki page title to an in-app route when a matching object exists.
 * Preference: Ship → Infobox → other exact search hit (excluding vague trait hits).
 */
export function resolveObtainedLink(
  page: string,
  catalog: ObtainedLinkCatalog,
): RouteLocationRaw | null {
  const key = normalizeLookupKey(page);
  if (!key) return null;

  const shipId = catalog.shipsByName.get(key);
  if (shipId != null) {
    return getSearchResultRoute("Ship", shipId);
  }

  const infoboxId = catalog.infoboxesByName?.get(key);
  if (infoboxId != null) {
    return getSearchResultRoute("Infobox", infoboxId);
  }

  const hit = catalog.searchHitsByName?.get(key);
  if (hit && normalizeLookupKey(hit.name) === key) {
    // Skip starship-trait self-references that merely mention the lock box in obtained text.
    if (hit.type === "StarshipTrait") return null;
    return getSearchResultRoute(hit.type, hit.id);
  }

  return null;
}
