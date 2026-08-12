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

export type ShipNameFields = {
  id: number;
  name: string;
  displayClass?: string | null;
  displayPrefix?: string | null;
  displayType?: string | null;
};

export function normalizeLookupKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Normalize wiki/DB ship titles for matching.
 * Strips "-class" (e.g. "Denorios-class Bajoran Interceptor" → "denorios bajoran interceptor").
 */
export function normalizeShipLookupKey(value: string): string {
  return normalizeLookupKey(value)
    .replace(/\b([a-z0-9][a-z0-9'.]*)-class\b/g, "$1")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Alternate keys a ship should be findable under (wiki class naming, etc.). */
export function shipLookupKeys(ship: Omit<ShipNameFields, "id">): string[] {
  const keys = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value?.trim()) return;
    keys.add(normalizeLookupKey(value));
    keys.add(normalizeShipLookupKey(value));
  };

  add(ship.name);

  const className = ship.displayClass?.trim();
  const rest = [ship.displayPrefix, ship.displayType]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  if (className) {
    add(`${className} ${rest}`.trim());
    add(`${className}-class ${rest}`.trim());
  }

  return [...keys].filter(Boolean);
}

export function buildNameIdMap(
  entries: ReadonlyArray<{ id: number; name: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    for (const key of shipLookupKeys(entry)) {
      if (!map.has(key)) map.set(key, entry.id);
    }
  }
  return map;
}

/** Map wiki/page titles onto full ship records (supports -class aliases). */
export function buildShipRefMap<T extends ShipNameFields>(
  entries: ReadonlyArray<T>,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const entry of entries) {
    for (const key of shipLookupKeys(entry)) {
      if (!map.has(key)) map.set(key, entry);
    }
  }
  return map;
}

export function lookupShipRef<T extends ShipNameFields>(
  map: Map<string, T>,
  page: string,
): T | undefined {
  return (
    map.get(normalizeShipLookupKey(page)) ?? map.get(normalizeLookupKey(page))
  );
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
  const shipKey = normalizeShipLookupKey(page);
  if (!key) return null;

  const shipId =
    catalog.shipsByName.get(shipKey) ?? catalog.shipsByName.get(key);
  if (shipId != null) {
    return getSearchResultRoute("Ship", shipId);
  }

  const infoboxId = catalog.infoboxesByName?.get(key);
  if (infoboxId != null) {
    return getSearchResultRoute("Infobox", infoboxId);
  }

  const hit =
    catalog.searchHitsByName?.get(key) ??
    catalog.searchHitsByName?.get(shipKey);
  if (hit && normalizeLookupKey(hit.name) === key) {
    // Skip starship-trait self-references that merely mention the lock box in obtained text.
    if (hit.type === "StarshipTrait") return null;
    return getSearchResultRoute(hit.type, hit.id);
  }

  return null;
}
