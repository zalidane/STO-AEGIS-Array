import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import { itemSlotClassesFromType, type HullSlotKind } from "./slotClass";
import {
  ITEM_QUALITIES,
  type ItemQuality,
} from "./slotQuality";

export type LoadoutModifier = {
  modifier: string;
  stats?: string | null;
  type: string;
  available?: string | null;
  isunique: boolean;
  isepic: boolean;
};

export type ModifierOption = {
  token: string;
  stats: string;
  unique: boolean;
  epic: boolean;
};

export type ModifierSocketView = {
  index: number;
  value: string;
  options: ModifierOption[];
};

const QUALITY_MODIFIER_SLOTS: Record<ItemQuality, number> = {
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  "Very Rare": 3,
  "Ultra Rare": 4,
  Epic: 5,
};

const CAREER_CONSOLE_KINDS: ReadonlySet<HullSlotKind> = new Set([
  "tacticalConsole",
  "engineeringConsole",
  "scienceConsole",
]);

const CAREER_CONSOLE_TYPES = [
  "ship tactical console",
  "ship engineering console",
  "ship science console",
] as const;

export function modifierSlotCountForQuality(
  quality: string | null | undefined,
): number {
  if (!quality) return QUALITY_MODIFIER_SLOTS["Very Rare"];
  const matched = ITEM_QUALITIES.find(
    (row) => row.toLowerCase() === quality.trim().toLowerCase(),
  );
  if (!matched) return QUALITY_MODIFIER_SLOTS["Very Rare"];
  return QUALITY_MODIFIER_SLOTS[matched];
}

export function slotAllowsSuffixModifiers(
  kind: HullSlotKind,
  itemType?: string | null,
): boolean {
  if (kind === "starshipTrait") return false;
  if (!CAREER_CONSOLE_KINDS.has(kind)) return true;
  return itemSlotClassesFromType(itemType).includes("universalConsole");
}

export function parseTypeParts(type: string | null | undefined): string[] {
  if (!type?.trim()) return [];
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const part of type.split(",")) {
    const normalized = part.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    parts.push(normalized);
  }
  return parts;
}

export function itemTypePartsForModifiers(
  itemType: string | null | undefined,
): string[] {
  const parts = parseTypeParts(itemType);
  if (!parts.includes("universal console")) return parts;
  const seen = new Set(parts);
  const expanded = [...parts];
  for (const extra of CAREER_CONSOLE_TYPES) {
    if (seen.has(extra)) continue;
    seen.add(extra);
    expanded.push(extra);
  }
  return expanded;
}

function availableNames(available: string | null | undefined): string[] | null {
  if (available == null || !available.trim()) return null;
  const names = available
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return names.length > 0 ? names : null;
}

export function modifierFitsItem(
  modifier: Pick<LoadoutModifier, "type" | "available">,
  item: { type?: string | null; name?: string | null },
): boolean {
  const itemParts = itemTypePartsForModifiers(item.type);
  if (itemParts.length === 0) return false;
  const itemPartSet = new Set(itemParts);
  const overlaps = parseTypeParts(modifier.type).some((part) =>
    itemPartSet.has(part),
  );
  if (!overlaps) return false;
  if (itemPartSet.has("universal console")) return true;
  const names = availableNames(modifier.available);
  if (!names) return true;
  const needle = item.name?.trim().toLowerCase() ?? "";
  if (!needle) return false;
  return names.includes(needle);
}

export function modifierFitsSocket(
  modifier: Pick<LoadoutModifier, "modifier" | "isunique" | "isepic">,
  input: {
    index: number;
    count: number;
    selected: readonly string[];
    hasEpicOptions?: boolean;
  },
): boolean {
  if (input.count <= 0 || input.index < 0 || input.index >= input.count) {
    return false;
  }
  const epicSocket = input.count === 5 && input.index === 4;
  const epicOnly = epicSocket && input.hasEpicOptions !== false;
  if (epicOnly) return modifier.isepic;
  if (modifier.isepic) return false;
  if (!modifier.isunique) return true;
  return !input.selected.some(
    (token, index) => index !== input.index && token === modifier.modifier,
  );
}

function catalogForToken(
  catalog: ReadonlyArray<LoadoutModifier>,
  token: string,
  item: { type?: string | null; name?: string | null },
): LoadoutModifier | undefined {
  return catalog.find(
    (row) => row.modifier === token && modifierFitsItem(row, item),
  );
}

export function trimModifiersForQuality(
  selected: readonly string[] | undefined,
  quality: string | null | undefined,
): string[] | undefined {
  const count = modifierSlotCountForQuality(quality);
  if (count === 0 || !selected?.length) return undefined;
  const next = selected.slice(0, count);
  while (next.length > 0 && !next[next.length - 1]?.trim()) next.pop();
  return next.length > 0 ? next : undefined;
}

export function pruneModifiersForItem(input: {
  selected: readonly string[] | undefined;
  quality: string | null | undefined;
  item: { type?: string | null; name?: string | null };
  catalog?: ReadonlyArray<LoadoutModifier>;
}): string[] | undefined {
  const trimmed = trimModifiersForQuality(input.selected, input.quality);
  if (!trimmed?.length) return undefined;
  if (!input.catalog?.length) return trimmed;
  const count = modifierSlotCountForQuality(input.quality);
  const hasEpicOptions = input.catalog.some(
    (row) => row.isepic && modifierFitsItem(row, input.item),
  );
  const kept: string[] = [];
  for (let index = 0; index < trimmed.length; index += 1) {
    const token = trimmed[index] ?? "";
    if (!token.trim()) {
      kept.push("");
      continue;
    }
    const row = catalogForToken(input.catalog, token, input.item);
    if (!row) {
      kept.push("");
      continue;
    }
    if (
      !modifierFitsSocket(row, {
        index,
        count,
        selected: trimmed,
        hasEpicOptions,
      })
    ) {
      kept.push("");
      continue;
    }
    kept.push(token);
  }
  while (kept.length > 0 && !kept[kept.length - 1]?.trim()) kept.pop();
  return kept.length > 0 ? kept : undefined;
}

export function seatedSuffixModifiers(input: {
  kind: HullSlotKind;
  itemType?: string | null;
  itemName?: string | null;
  quality: string | null | undefined;
  selected: readonly string[] | undefined;
  catalog?: ReadonlyArray<LoadoutModifier>;
}): string[] | undefined {
  if (!slotAllowsSuffixModifiers(input.kind, input.itemType)) return undefined;
  return pruneModifiersForItem({
    selected: input.selected,
    quality: input.quality,
    item: { type: input.itemType, name: input.itemName },
    catalog: input.catalog,
  });
}

export function applyModifierPick(input: {
  selected: readonly string[] | undefined;
  index: number;
  token: string;
  quality: string | null | undefined;
}): string[] | undefined {
  const count = modifierSlotCountForQuality(input.quality);
  if (count === 0 || input.index < 0 || input.index >= count) {
    return trimModifiersForQuality(input.selected, input.quality);
  }
  const next = Array.from(
    { length: Math.max(count, input.selected?.length ?? 0) },
    (_, index) => input.selected?.[index] ?? "",
  ).slice(0, count);
  next[input.index] = input.token.trim();
  return trimModifiersForQuality(next, input.quality);
}

export function modifierStatsText(stats: string | null | undefined): string {
  if (!stats) return "";
  return decodeHtmlEntities(stats)
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesModifierQuery(
  option: Pick<ModifierOption, "token" | "stats">,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    option.token.toLowerCase().includes(needle) ||
    option.stats.toLowerCase().includes(needle)
  );
}

export function itemHasSuffixCatalog(
  catalog: ReadonlyArray<LoadoutModifier>,
  item: { type?: string | null; name?: string | null },
): boolean {
  return catalog.some((row) => modifierFitsItem(row, item));
}

export function slotShowsSuffixModifiers(input: {
  kind: HullSlotKind;
  itemType?: string | null;
  itemName?: string | null;
  selected?: readonly string[];
  catalog: ReadonlyArray<LoadoutModifier>;
}): boolean {
  if (!slotAllowsSuffixModifiers(input.kind, input.itemType)) return false;
  if (input.selected?.some((token) => token.trim())) return true;
  return itemHasSuffixCatalog(input.catalog, {
    type: input.itemType,
    name: input.itemName,
  });
}

function optionFromModifier(row: LoadoutModifier): ModifierOption {
  return {
    token: row.modifier,
    stats: modifierStatsText(row.stats),
    unique: row.isunique,
    epic: row.isepic,
  };
}

export function modifierSocketsForItem(input: {
  kind: HullSlotKind;
  quality: string | null | undefined;
  itemType?: string | null;
  itemName?: string | null;
  selected?: readonly string[];
  catalog: ReadonlyArray<LoadoutModifier>;
}): ModifierSocketView[] {
  if (!slotAllowsSuffixModifiers(input.kind, input.itemType)) return [];
  const count = modifierSlotCountForQuality(input.quality);
  if (count === 0) return [];
  const item = { type: input.itemType, name: input.itemName };
  const selected = Array.from(
    { length: count },
    (_, index) => input.selected?.[index] ?? "",
  );
  const fitting = input.catalog.filter((row) => modifierFitsItem(row, item));
  const hasEpicOptions = fitting.some((row) => row.isepic);
  return selected.map((value, index) => {
    const options = fitting
      .filter((row) =>
        modifierFitsSocket(row, { index, count, selected, hasEpicOptions }),
      )
      .map(optionFromModifier)
      .sort((left, right) => {
        if (left.epic !== right.epic) return left.epic ? 1 : -1;
        if (left.unique !== right.unique) return left.unique ? 1 : -1;
        return left.token.localeCompare(right.token);
      });
    if (value && !options.some((option) => option.token === value)) {
      const orphan = catalogForToken(input.catalog, value, item);
      options.unshift(
        orphan
          ? optionFromModifier(orphan)
          : { token: value, stats: "", unique: false, epic: false },
      );
    }
    return { index, value, options };
  });
}
