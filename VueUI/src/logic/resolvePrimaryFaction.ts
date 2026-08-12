import { getFactionColor, getFactionGlow } from "@/mappers/factionColors";
import { sortFactionsByFacSort } from "@/utils/sortFactionsByFacSort";

export type FactionIdentity = {
  faction?: string | null;
  factionLede?: string | null;
  facSort?: string | null;
};

/**
 * Primary faction for UI coloring / letters.
 * Prefer factionLede; otherwise first faction from facSort ordering.
 */
export function resolvePrimaryFaction(
  identity: FactionIdentity | null | undefined,
): string {
  const lede = identity?.factionLede?.trim();
  if (lede) return lede;

  const ordered = sortFactionsByFacSort(identity?.faction, identity?.facSort);
  return ordered[0] ?? "";
}

export function resolveFactionThemeColor(
  identity: FactionIdentity | null | undefined,
): string {
  return getFactionColor(resolvePrimaryFaction(identity));
}

export function resolveFactionAccent(
  identity: FactionIdentity | null | undefined,
): string {
  return getFactionGlow(resolvePrimaryFaction(identity));
}

/** Map a primary faction string to the obtained-mark letter key. */
export function factionMarkKey(
  primaryFaction: string,
): "federation" | "klingon" | "romulan" | "dominion" | "cross" | "neutral" {
  if (/cross[-\s]?faction/i.test(primaryFaction)) return "cross";
  if (/federation|united\b/i.test(primaryFaction)) return "federation";
  if (/klingon/i.test(primaryFaction)) return "klingon";
  if (/romulan/i.test(primaryFaction)) return "romulan";
  if (/dominion/i.test(primaryFaction)) return "dominion";
  return "neutral";
}
