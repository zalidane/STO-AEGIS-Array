/** Vuetify theme color keys for playable factions. */
export function getFactionColor(faction: string): string {
  if (faction.includes("Federation")) return "federation";
  if (faction.includes("Klingon")) return "klingon";
  if (faction.includes("Romulan")) return "romulan";
  if (faction.includes("Dominion")) return "dominion";
  return "neutral";
}

/** Glow accent used behind the ship hero image. */
export function getFactionGlow(primaryFaction: string | null | undefined): string {
  const faction = primaryFaction ?? "";

  if (faction.startsWith("United")) return "#3fa7ff";
  if (faction.startsWith("Klingon")) return "#ff4d4d";
  if (faction.startsWith("Romulan")) return "#00cc66";

  return "#9966ff";
}
