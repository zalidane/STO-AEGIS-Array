import {
  factionMarkKey,
  resolvePrimaryFaction,
  type FactionIdentity,
} from "@/logic/resolvePrimaryFaction";
import { getFactionColor, getFactionGlow } from "@/mappers/factionColors";

/** Fac Sort tab order: Fed → Klingon → Romulan → Dominion → Cross-Faction. */
export const COLLECTION_FACTION_TAB_ORDER = [
  "federation",
  "klingon",
  "romulan",
  "dominion",
  "cross",
] as const;

export type CollectionFactionTabId =
  (typeof COLLECTION_FACTION_TAB_ORDER)[number];

export const COLLECTION_FACTION_TAB_LABEL: Record<
  CollectionFactionTabId,
  string
> = {
  federation: "Federation",
  klingon: "Klingon",
  romulan: "Romulan",
  dominion: "Dominion",
  cross: "Cross-Faction",
};

export type CollectionFactionTab<T> = {
  id: CollectionFactionTabId;
  label: string;
  color: string;
  accent: string;
  rows: T[];
};

export function collectionFactionTabId(
  identity: FactionIdentity | null | undefined,
): CollectionFactionTabId | null {
  const primary = resolvePrimaryFaction(identity);
  const key = factionMarkKey(primary);
  if (key === "neutral") return null;
  return key;
}

export function isCollectionFactionTabId(
  value: string | null | undefined,
): value is CollectionFactionTabId {
  return (
    !!value &&
    (COLLECTION_FACTION_TAB_ORDER as readonly string[]).includes(value)
  );
}

/** Keep a requested faction tab when it still has rows; otherwise first non-empty. */
export function resolveCollectionFactionTab(
  requested: string | null | undefined,
  available: ReadonlyArray<CollectionFactionTabId>,
): CollectionFactionTabId | null {
  if (available.length === 0) return null;
  if (
    isCollectionFactionTabId(requested) &&
    available.includes(requested)
  ) {
    return requested;
  }
  return available[0] ?? null;
}

/**
 * Group rows by primary faction (factionLede → facSort).
 * Only emits tabs that have at least one row, in Fac Sort order.
 */
export function groupCollectionByFaction<T>(
  rows: ReadonlyArray<T>,
  identityOf: (row: T) => FactionIdentity | null | undefined,
): Array<CollectionFactionTab<T>> {
  const buckets = new Map<CollectionFactionTabId, T[]>();
  for (const id of COLLECTION_FACTION_TAB_ORDER) {
    buckets.set(id, []);
  }

  for (const row of rows) {
    const tabId = collectionFactionTabId(identityOf(row));
    if (!tabId) continue;
    buckets.get(tabId)!.push(row);
  }

  return COLLECTION_FACTION_TAB_ORDER.flatMap((id) => {
    const tabRows = buckets.get(id) ?? [];
    if (tabRows.length === 0) return [];
    const label = COLLECTION_FACTION_TAB_LABEL[id];
    return [
      {
        id,
        label,
        color: getFactionColor(label === "Klingon" ? "Klingon Empire" : label),
        accent: getFactionGlow(label === "Klingon" ? "Klingon Empire" : label),
        rows: tabRows,
      },
    ];
  });
}
