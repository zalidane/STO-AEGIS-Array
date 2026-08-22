export type HomeSectionKey = "ships" | "traits" | "starshipTraits";

export type HomeSectionDefinition = {
  key: HomeSectionKey;
  title: string;
  to: string;
  description: string;
  icon: string;
  singular: string;
  plural: string;
};

export type HomeSectionCard = HomeSectionDefinition & {
  count: number | null;
  countLabel: string;
};

export const HOME_SECTIONS: readonly HomeSectionDefinition[] = [
  {
    key: "ships",
    title: "Ships",
    to: "/ships",
    description: "Browse all available ships and their details.",
    icon: "mdi-ferry",
    singular: "vessel",
    plural: "vessels",
  },
  {
    key: "traits",
    title: "Traits",
    to: "/traits",
    description: "Explore personal space and ground traits.",
    icon: "mdi-star-outline",
    singular: "trait",
    plural: "traits",
  },
  {
    key: "starshipTraits",
    title: "Starship Traits",
    to: "/starship-traits",
    description: "Browse starship traits unlocked from vessels.",
    icon: "mdi-star",
    singular: "starship trait",
    plural: "starship traits",
  },
];

export function formatCatalogCount(
  count: number | null,
  singular: string,
  plural: string,
): string {
  if (count == null) return "Loading…";
  const noun = count === 1 ? singular : plural;
  return `${count.toLocaleString()} ${noun}`;
}

export function buildHomeSectionCards(
  counts: Record<HomeSectionKey, number | null>,
): HomeSectionCard[] {
  return HOME_SECTIONS.map((section) => ({
    ...section,
    count: counts[section.key],
    countLabel: formatCatalogCount(
      counts[section.key],
      section.singular,
      section.plural,
    ),
  }));
}

/**
 * Pick one item uniformly at random. `random` is injectable for tests.
 * Values outside `[0, 1)` are clamped so `1` never indexes past the last item.
 */
export function pickRandomItem<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;

  const sample = random();
  const unit = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 0.999999) : 0;
  const index = Math.floor(unit * items.length);
  return items[index] ?? null;
}

/** Keep an already chosen featured item; otherwise pick from the newly loaded list. */
export function keepOrPickRandom<T>(
  current: T | null,
  items: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (current != null) return current;
  return pickRandomItem(items, random);
}
