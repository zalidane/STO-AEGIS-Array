import { CLOAK_FILTER_OPTIONS, type CloakFilterOption } from "./types";

/**
 * Longer phrases first so "Enhanced Battle Cloak" is not also "Battle Cloak"
 * or "Cloak", and "Battle Cloak" is not also "Cloak".
 */
const CLOAK_MATCH_ORDER: readonly CloakFilterOption[] = [
  "Enhanced Battle Cloak",
  "Battle Cloak",
  "Cloak",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One cloak class per ability token, or null when the token is not a cloak. */
export function cloakTypeForAbilityToken(
  token: string,
): CloakFilterOption | null {
  const normalized = token.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  for (const option of CLOAK_MATCH_ORDER) {
    const pattern = new RegExp(`\\b${escapeRegExp(option)}\\b`, "i");
    if (pattern.test(normalized)) return option;
  }
  return null;
}

/** Unique cloak classes on a hull, in filter-chip order. */
export function cloakTypesFromAbilities(
  abilities: string | null | undefined,
): CloakFilterOption[] {
  if (!abilities?.trim()) return [];
  const found = new Set<CloakFilterOption>();
  for (const part of abilities.split(",")) {
    const type = cloakTypeForAbilityToken(part);
    if (type) found.add(type);
  }
  return CLOAK_FILTER_OPTIONS.filter((option) => found.has(option));
}
