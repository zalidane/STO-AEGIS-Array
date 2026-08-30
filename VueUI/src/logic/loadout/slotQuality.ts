import type { HullSlotKind } from "./slotClass";
import type { LoadoutSlotFill } from "./types";

export const ITEM_QUALITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Ultra Rare",
  "Epic",
] as const;

export type ItemQuality = (typeof ITEM_QUALITIES)[number];

export const ITEM_MARKS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
] as const;

export type ItemMark = (typeof ITEM_MARKS)[number];

export const DEFAULT_ITEM_MARK: ItemMark = "XV";
export const DEFAULT_ITEM_QUALITY: ItemQuality = "Very Rare";

/** STO rarity pip colors for seated quality. */
export const QUALITY_COLORS: Record<ItemQuality, string> = {
  Common: "#e8e8e8",
  Uncommon: "#2ecc40",
  Rare: "#3d8bfd",
  "Very Rare": "#c084fc",
  "Ultra Rare": "#fb923c",
  Epic: "#facc15",
};

export function qualityColor(quality: ItemQuality): string {
  return QUALITY_COLORS[quality];
}

export function slotUsesItemMods(kind: HullSlotKind): boolean {
  return kind !== "starshipTrait";
}

export function qualityFromRarity(
  rarity: string | null | undefined,
): ItemQuality {
  const needle = rarity?.trim().toLowerCase();
  if (!needle) return DEFAULT_ITEM_QUALITY;
  return (
    ITEM_QUALITIES.find((quality) => quality.toLowerCase() === needle) ??
    DEFAULT_ITEM_QUALITY
  );
}

export function inheritModsFromPreviousSameKind(
  slots: ReadonlyArray<{ id: string; kind: HullSlotKind; index: number }>,
  fills: ReadonlyArray<LoadoutSlotFill>,
  current: { kind: HullSlotKind; index: number },
): { quality?: string; mark?: string } {
  const fillBySlot = new Map(fills.map((fill) => [fill.slotId, fill]));
  const earlier = slots
    .filter((slot) => slot.kind === current.kind && slot.index < current.index)
    .sort((left, right) => right.index - left.index);

  for (const slot of earlier) {
    const fill = fillBySlot.get(slot.id);
    if (!fill) continue;
    return { quality: fill.quality, mark: fill.mark };
  }
  return {};
}

export function modsForNewFill(input: {
  kind: HullSlotKind;
  catalogKind: string;
  existing?: LoadoutSlotFill;
  inherited?: { quality?: string; mark?: string };
  rarity?: string | null;
}): { quality?: string; mark?: string } {
  if (!slotUsesItemMods(input.kind) || input.catalogKind !== "item") {
    return {};
  }
  return {
    quality:
      input.existing?.quality ??
      input.inherited?.quality ??
      qualityFromRarity(input.rarity),
    mark: input.existing?.mark ?? input.inherited?.mark ?? DEFAULT_ITEM_MARK,
  };
}

export function displayedQuality(
  fill: LoadoutSlotFill | null | undefined,
  rarity?: string | null,
): ItemQuality {
  const value = fill?.quality;
  if (value && ITEM_QUALITIES.includes(value as ItemQuality)) {
    return value as ItemQuality;
  }
  return qualityFromRarity(rarity);
}

export function displayedMark(
  fill: LoadoutSlotFill | null | undefined,
): ItemMark {
  return normalizeMark(fill?.mark);
}

export function normalizeMark(value: string | null | undefined): ItemMark {
  const roman = value?.replace(/^mk\s*/i, "").trim();
  if (roman && ITEM_MARKS.includes(roman as ItemMark)) {
    return roman as ItemMark;
  }
  return DEFAULT_ITEM_MARK;
}
