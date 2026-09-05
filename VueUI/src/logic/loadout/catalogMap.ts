import type { InfoboxTextFields } from "@/logic/collection/itemText";
import { loadoutItemSearchText } from "@/logic/loadout/pickerSearch";
import { loadoutOwnershipKey } from "@/logic/loadout/setBonus";
import {
  BOFF_CATALOG_KIND,
  type BoffPowerSource,
} from "@/logic/loadout/boffPowers";
import type { CaptainTraitSource } from "@/logic/loadout/captainTraits";
import type { LoadoutCatalogKind, LoadoutItem } from "@/logic/loadout/types";
import {
  getItemImageUrl,
  getStarshipTraitImageUrl,
  getTraitImageUrl,
  getTraySkillImageUrl,
} from "@/utils/wikiImage";

export type LoadoutInfoboxRow = InfoboxTextFields & {
  id: number;
  name: string;
  type: string | null;
  rarity?: string | null;
  image?: string | null;
  equiplimit?: number | null;
  who?: string | null;
};

export type LoadoutStarshipTraitRow = {
  id: number;
  name: string;
  iconName?: string | null;
};

export type LoadoutPersonalTraitRow = {
  id: number;
  name: string;
  type: string | null;
  iconName?: string | null;
  environment?: string | null;
  career?: string | null;
  required?: string | null;
  source?: string | null;
};

export type LoadoutTraySkillRow = {
  id: number;
  name: string;
  type: string | null;
  image?: string | null;
  region?: string | null;
  description?: string | null;
  system?: string | null;
  rank1rank?: string | null;
  rank2rank?: string | null;
  rank3rank?: string | null;
  rank4rank?: string | null;
  rank5rank?: string | null;
};

export function toLoadoutItem(row: LoadoutInfoboxRow): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    rarity: row.rarity,
    image: getItemImageUrl(row.image, row.name),
    equiplimit: row.equiplimit,
    catalogKind: "item",
    who: row.who,
    searchText: loadoutItemSearchText(row),
  };
}

export function toLoadoutTrait(row: LoadoutStarshipTraitRow): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: "starship trait",
    image: getStarshipTraitImageUrl(row.name, row.iconName),
    equiplimit: 1,
    catalogKind: "starshipTrait",
  };
}

export function toLoadoutPersonalTrait(
  row: LoadoutPersonalTraitRow,
): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    image: getTraitImageUrl(row.name, row.iconName),
    equiplimit: 1,
    catalogKind: "trait",
    environment: row.environment,
    career: row.career,
    required: row.required,
    who: row.source,
  };
}

export function toLoadoutTraySkill(row: LoadoutTraySkillRow): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    image: getTraySkillImageUrl(row.name, row.image),
    catalogKind: BOFF_CATALOG_KIND,
    environment: row.region,
    searchText: [row.description, row.system].filter(Boolean).join(" "),
    ranks: [
      row.rank1rank,
      row.rank2rank,
      row.rank3rank,
      row.rank4rank,
      row.rank5rank,
    ],
  };
}

export function asBoffPower(item: LoadoutItem): BoffPowerSource {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    region: item.environment ?? null,
    ranks: item.ranks ?? [],
  };
}

export function asCaptainTrait(item: LoadoutItem): CaptainTraitSource {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    environment: item.environment ?? null,
    career: item.career,
    required: item.required,
    catalogKind:
      item.catalogKind === "starshipTrait" ? "starshipTrait" : "trait",
    image: item.image,
  };
}

export function buildLoadoutCatalog(input: {
  items?: ReadonlyArray<LoadoutInfoboxRow>;
  starshipTraits?: ReadonlyArray<LoadoutStarshipTraitRow>;
  traits?: ReadonlyArray<LoadoutPersonalTraitRow>;
  traySkills?: ReadonlyArray<LoadoutTraySkillRow>;
}): LoadoutItem[] {
  return [
    ...(input.items ?? []).map(toLoadoutItem),
    ...(input.starshipTraits ?? []).map(toLoadoutTrait),
    ...(input.traits ?? []).map(toLoadoutPersonalTrait),
    ...(input.traySkills ?? []).map(toLoadoutTraySkill),
  ];
}

export function indexLoadoutItemsByKey(
  items: ReadonlyArray<LoadoutItem>,
): Map<string, LoadoutItem> {
  const map = new Map<string, LoadoutItem>();
  for (const item of items) {
    map.set(loadoutOwnershipKey(item.catalogKind, item.id), item);
  }
  return map;
}

export function lookupLoadoutItem(
  byKey: ReadonlyMap<string, LoadoutItem>,
  catalogKind: LoadoutCatalogKind | undefined,
  itemId: number,
): LoadoutItem | null {
  return byKey.get(loadoutOwnershipKey(catalogKind, itemId)) ?? null;
}
