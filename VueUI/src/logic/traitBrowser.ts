import type { FactionIdentity } from "@/logic/resolvePrimaryFaction";
import { normalizeWikiPlainText } from "@/logic/wikiPlainText";
import {
  getStarshipTraitImageUrl,
  getTraitImageUrl,
} from "@/utils/wikiImage";

export type TraitBrowserShip = {
  id: number;
  name: string;
  displayClass?: string | null;
  displayPrefix?: string | null;
  displayType?: string | null;
} & FactionIdentity;

export type TraitBrowserMetaChip = {
  label: string;
  value: string;
};

/** Normalized row for Traits / Starship Traits / Tray Skills browsers. */
export type TraitBrowserItem = {
  id: number;
  name: string;
  /** Compact blurb for the left list. */
  listDescription: string | null;
  /** Full plain text shown on the detail card. */
  detailDescription: string | null;
  /** Wiki markup for ObtainedMarkup (source / obtained / long description). */
  source: string | null;
  /** Optional explicit meta chips; falls back to type/environment/career. */
  meta?: TraitBrowserMetaChip[];
  /** Infobox Text 1–9 rows for item preview cards. */
  textBlocks?: Array<{ text: string; subscript: string | null }>;
  /** Local public path from wiki extract, if the file was downloaded. */
  imageSrc?: string | null;
  type: string | null;
  environment: string | null;
  career: string | null;
  ships?: ReadonlyArray<TraitBrowserShip>;
};

export function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Strip wiki list markers, emphasis, and link/file markup from trait body text.
 * HTML `<br>` / list tags become line breaks; leftover tags are removed.
 */
export function cleanTraitDescriptionText(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;

  const cleaned = normalizeWikiPlainText(raw)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line
        // Leading wiki bullets / indents: "*", "**", ":", "#", or mixes.
        .replace(/^\s*[*#:]+[\s*]*/g, "")
        .replace(/'{2,}/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .trimEnd(),
    )
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned || null;
}

export function traitBrowserMetaChips(
  item: TraitBrowserItem | null | undefined,
): TraitBrowserMetaChip[] {
  if (!item) return [];
  if (item.meta?.length) {
    return item.meta.filter((chip) => Boolean(chip.value?.trim()));
  }
  return [
    { label: "Type", value: displayTraitType(item.type) ?? "" },
    { label: "Environment", value: displayTraitEnvironment(item.environment) ?? "" },
    { label: "Career", value: item.career ?? "" },
  ].filter((chip) => Boolean(chip.value.trim()));
}

const TRAIT_TYPE_LABELS: Record<string, string> = {
  char: "Personal",
  boff: "Bridge officer",
  doff: "Duty officer",
  reputation: "Reputation",
  activereputation: "Active reputation",
};

export function displayTraitType(
  type: string | null | undefined,
): string | null {
  const trimmed = type?.trim();
  if (!trimmed) return null;
  return TRAIT_TYPE_LABELS[trimmed.toLowerCase()] ?? trimmed;
}

export function displayTraitEnvironment(
  environment: string | null | undefined,
): string | null {
  const trimmed = environment?.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export type TraitBrowserFacets = {
  types?: readonly string[];
  environments?: readonly string[];
  hideCollected?: boolean;
  collectedIds?: ReadonlySet<number>;
};

function matchesFacet(
  selected: readonly string[] | undefined,
  value: string | null,
): boolean {
  if (!selected?.length) return true;
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return selected.includes(trimmed);
}

export function uniqueTraitFacetValues(
  items: readonly TraitBrowserItem[],
  field: "type" | "environment",
): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const trimmed = item[field]?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => {
    const left = (field === "type" ? displayTraitType(a) : displayTraitEnvironment(a)) ?? a;
    const right = (field === "type" ? displayTraitType(b) : displayTraitEnvironment(b)) ?? b;
    return left.localeCompare(right);
  });
}

export function filterTraitBrowserItems(
  items: readonly TraitBrowserItem[],
  search: string,
  facets?: TraitBrowserFacets,
): TraitBrowserItem[] {
  const needle = search.trim().toLowerCase();
  const types = facets?.types ?? [];
  const environments = facets?.environments ?? [];

  return items.filter((item) => {
    if (!matchesFacet(types, item.type)) return false;
    if (!matchesFacet(environments, item.environment)) return false;
    if (facets?.hideCollected && facets.collectedIds?.has(item.id)) {
      return false;
    }
    if (!needle) return true;

    const haystack = [
      item.name,
      item.listDescription,
      item.detailDescription,
      item.source,
      item.type,
      displayTraitType(item.type),
      item.environment,
      displayTraitEnvironment(item.environment),
      item.career,
      ...(item.meta ?? []).flatMap((chip) => [chip.label, chip.value]),
      ...(item.textBlocks ?? []).flatMap((block) => [
        block.text,
        block.subscript,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function resolveSelectedTrait(
  items: readonly TraitBrowserItem[],
  selectedId: number | null,
): TraitBrowserItem | null {
  if (items.length === 0) return null;
  if (selectedId != null) {
    const match = items.find((item) => item.id === selectedId);
    if (match) return match;
  }
  return items[0] ?? null;
}

export type PersonalTraitSource = {
  id: number;
  name: string;
  description: string | null;
  shortDescription: string | null;
  source: string | null;
  type: string | null;
  environment: string | null;
  career: string | null;
  iconName?: string | null;
};

export type StarshipTraitSource = {
  id: number;
  name: string;
  short: string | null;
  basic: string | null;
  detailed: string | null;
  obtained: string | null;
  type: string | null;
  iconName?: string | null;
  ships?: ReadonlyArray<TraitBrowserShip>;
};

export function mapPersonalTraitToBrowserItem(
  trait: PersonalTraitSource,
): TraitBrowserItem {
  const description = cleanTraitDescriptionText(
    firstNonEmpty(trait.description, trait.shortDescription),
  );
  return {
    id: trait.id,
    name: trait.name,
    listDescription: description,
    detailDescription: description,
    source: trait.source,
    type: trait.type,
    environment: trait.environment,
    career: trait.career,
    imageSrc: getTraitImageUrl(trait.name, trait.iconName),
  };
}

export function mapStarshipTraitToBrowserItem(
  trait: StarshipTraitSource,
): TraitBrowserItem {
  return {
    id: trait.id,
    name: trait.name,
    listDescription: cleanTraitDescriptionText(
      firstNonEmpty(trait.short, trait.basic, trait.detailed),
    ),
    detailDescription: cleanTraitDescriptionText(
      firstNonEmpty(trait.detailed, trait.basic, trait.short),
    ),
    source: trait.obtained,
    type: trait.type,
    environment: null,
    career: null,
    ships: trait.ships,
    imageSrc: getStarshipTraitImageUrl(trait.name, trait.iconName),
  };
}
