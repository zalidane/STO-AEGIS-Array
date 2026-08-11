/** Vuetify theme color keys for playable factions. */
export function getFactionColor(faction: string): string {
  if (/cross[-\s]?faction/i.test(faction)) return "neutral";
  if (faction.includes("Federation")) return "federation";
  if (faction.includes("Klingon")) return "klingon";
  if (faction.includes("Romulan")) return "romulan";
  if (faction.includes("Dominion")) return "dominion";
  return "neutral";
}

/**
 * Accent hex for borders / glows.
 * Uses the ship's primary faction / lede only — Cross-Faction must not
 * inherit Dominion purple (or any single playable-faction color).
 */
export function getFactionGlow(primaryFaction: string | null | undefined): string {
  const faction = (primaryFaction ?? "").trim();

  // Cross-Faction first: distinct silver, never Dominion/Federation purple-blue.
  if (/cross[-\s]?faction/i.test(faction)) return "#c5d0da";

  if (/federation/i.test(faction) || /^united\b/i.test(faction)) {
    return "#3fa7ff";
  }
  if (/klingon/i.test(faction)) return "#d32f2f";
  if (/romulan/i.test(faction)) return "#00c853";
  if (/dominion/i.test(faction)) return "#9c27b0";

  return "#9e9e9e";
}
