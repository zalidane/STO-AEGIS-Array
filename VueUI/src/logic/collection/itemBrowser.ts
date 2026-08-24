import {
  infoboxTextBlocks,
  type InfoboxTextFields,
} from "./itemText";
import {
  firstNonEmpty,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import { getItemImageUrl } from "@/utils/wikiImage";

/** Wiki cargo still uses Engine; STO calls these cores. */
const INFOBOX_TYPE_DISPLAY_LABELS: Record<string, string> = {
  "warp engine": "Warp Core",
  "singularity engine": "Singularity Core",
};

/**
 * Player-facing item type label. Impulse engines stay engines.
 */
export function displayInfoboxType(
  type: string | null | undefined,
): string | null {
  if (type == null) return null;
  const trimmed = type.trim();
  if (!trimmed) return type;

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((part) => displayInfoboxTypePart(part.trim()))
      .filter(Boolean)
      .join(", ");
  }
  return displayInfoboxTypePart(trimmed);
}

function displayInfoboxTypePart(part: string): string {
  if (!part) return part;
  return INFOBOX_TYPE_DISPLAY_LABELS[part.toLowerCase()] ?? part;
}

/** Keep in sync with GraphQL/src/logic/equipmentInfobox.ts */
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
  image?: string | null;
};

export function mapEquipmentInfoboxToBrowserItem(
  item: EquipmentInfoboxSource,
): TraitBrowserItem {
  const textBlocks = infoboxTextBlocks(item);
  const type = displayInfoboxType(item.type);
  const description =
    textBlocks.map((block) => block.text).join("\n") ||
    firstNonEmpty(type);

  return {
    id: item.id,
    name: item.name,
    listDescription: textBlocks[0]?.text ?? description,
    detailDescription: description,
    source: item.who ?? null,
    type,
    environment: item.boundto ?? null,
    career: item.rarity ?? null,
    textBlocks,
    imageSrc: getItemImageUrl(item.image, item.name),
    meta: [
      { label: "Type", value: type ?? "" },
      { label: "Rarity", value: item.rarity ?? "" },
      { label: "Bound", value: item.boundto ?? "" },
    ],
  };
}
