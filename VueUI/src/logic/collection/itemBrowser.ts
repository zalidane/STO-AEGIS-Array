import {
  infoboxTextBlocks,
  type InfoboxTextFields,
} from "./itemText";
import {
  firstNonEmpty,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";

const EQUIPMENT_INFOBOX_TYPES = new Set([
  "universal console",
  "ship engineering console",
  "ship tactical console",
  "ship science console",
  "ship fore weapon",
  "ship aft weapon",
  "ship weapon",
  "experimental weapon",
  "shuttle weapon",
  "hangar bay",
  "ship device",
  "ship shields",
  "ship vanity shield",
  "ship vanity shields",
  "impulse engine",
  "warp engine",
  "singularity engine",
  "ship deflector dish",
  "ship secondary deflector",
  "ground weapon",
  "ground device",
  "ground armor",
  "body armor",
  "personal shield",
  "kit",
  "kit module",
  "kit modules",
  "ev suit",
]);

export function isEquipmentInfoboxType(
  type: string | null | undefined,
): boolean {
  const normalized = type?.trim().toLowerCase();
  if (!normalized) return false;
  return EQUIPMENT_INFOBOX_TYPES.has(normalized);
}

export function filterEquipmentInfoboxes<T extends { type?: string | null }>(
  items: readonly T[],
): T[] {
  return items.filter((item) => isEquipmentInfoboxType(item.type));
}

export type EquipmentInfoboxSource = InfoboxTextFields & {
  id: number;
  name: string;
  type: string | null;
  rarity?: string | null;
  boundto?: string | null;
  who?: string | null;
};

export function mapEquipmentInfoboxToBrowserItem(
  item: EquipmentInfoboxSource,
): TraitBrowserItem {
  const textBlocks = infoboxTextBlocks(item);
  const description =
    textBlocks.map((block) => block.text).join("\n") ||
    firstNonEmpty(item.type);

  return {
    id: item.id,
    name: item.name,
    listDescription: textBlocks[0]?.text ?? description,
    detailDescription: description,
    source: item.who ?? null,
    type: item.type,
    environment: item.boundto ?? null,
    career: item.rarity ?? null,
    textBlocks,
    meta: [
      { label: "Type", value: item.type ?? "" },
      { label: "Rarity", value: item.rarity ?? "" },
      { label: "Bound", value: item.boundto ?? "" },
    ],
  };
}
