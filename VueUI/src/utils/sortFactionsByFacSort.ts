/**
 * STO wiki Fac Sort letter codes → playable factions.
 * Order of letters in `facSort` (e.g. "acd", "dcba") is the display order.
 */
const FAC_SORT_LETTER_MATCHERS: Record<string, (faction: string) => boolean> = {
  a: (faction) => /federation/i.test(faction),
  b: (faction) => /klingon/i.test(faction),
  c: (faction) => /romulan/i.test(faction),
  d: (faction) => /dominion/i.test(faction),
};

function splitFactions(faction: string | null | undefined): string[] {
  if (!faction?.trim()) return [];
  return faction
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function factionLetter(faction: string): string | null {
  for (const [letter, matches] of Object.entries(FAC_SORT_LETTER_MATCHERS)) {
    if (matches(faction)) return letter;
  }
  return null;
}

/**
 * Split a comma-separated faction list and order it by `facSort`
 * letter sequence (e.g. "dcba" → Dominion, Romulan, Klingon, Federation).
 * Unrecognized factions keep relative order at the end.
 */
export function sortFactionsByFacSort(
  faction: string | null | undefined,
  facSort: string | null | undefined,
): string[] {
  const factions = splitFactions(faction);
  if (factions.length === 0) return [];

  const sortKey = facSort?.trim().toLowerCase();
  if (!sortKey) return factions;

  const orderIndex = new Map<string, number>();
  for (let i = 0; i < sortKey.length; i++) {
    const letter = sortKey[i]!;
    if (!orderIndex.has(letter)) orderIndex.set(letter, i);
  }

  return [...factions].sort((left, right) => {
    const leftLetter = factionLetter(left);
    const rightLetter = factionLetter(right);
    const leftOrder =
      leftLetter != null
        ? (orderIndex.get(leftLetter) ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;
    const rightOrder =
      rightLetter != null
        ? (orderIndex.get(rightLetter) ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY;
    return leftOrder - rightOrder;
  });
}

/** Display helper: comma-separated factions ordered by Fac Sort. */
export function formatFactionsByFacSort(
  faction: string | null | undefined,
  facSort: string | null | undefined,
): string {
  const ordered = sortFactionsByFacSort(faction, facSort);
  return ordered.length > 0 ? ordered.join(", ") : "N/A";
}
