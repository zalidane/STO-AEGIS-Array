import { fillCatalogKind, loadoutOwnershipKey } from "@/logic/loadout/setBonus";
import type {
  CollectionLoadout,
  LoadoutCatalogKind,
  LoadoutItem,
  LoadoutSlotFill,
} from "@/logic/loadout/types";

export const SHARE_SCHEMA_VERSION = 1 as const;
export const MIN_PUBLIC_FILLS = 8;

export type ShareCatalogKind = "item" | "starshipTrait" | "traySkill";

export type ShareSlot = {
  slotId: string;
  catalogKind: ShareCatalogKind;
  name: string;
  type?: string | null;
  quality?: string;
  mark?: string;
  abilityRank?: number;
};

export type SharePayload = {
  v: typeof SHARE_SCHEMA_VERSION;
  shipName: string;
  title: string;
  slots: ShareSlot[];
  boffSeatCareers?: CollectionLoadout["boffSeatCareers"];
};

export type ShareCatalogItem = Pick<
  LoadoutItem,
  "id" | "name" | "type" | "catalogKind"
>;

function isShareKind(kind: LoadoutCatalogKind): kind is ShareCatalogKind {
  return kind === "item" || kind === "starshipTrait" || kind === "traySkill";
}

function itemByFill(
  items: ReadonlyArray<ShareCatalogItem>,
  fill: LoadoutSlotFill,
): ShareCatalogItem | null {
  return (
    items.find(
      (item) =>
        item.id === fill.itemId &&
        (item.catalogKind ?? "item") === fillCatalogKind(fill),
    ) ?? null
  );
}

export function encodeSharePayload(input: {
  shipName: string;
  title: string;
  loadout: CollectionLoadout;
  items: ReadonlyArray<ShareCatalogItem>;
}): SharePayload {
  const slots: ShareSlot[] = [];
  for (const fill of input.loadout.slots) {
    const kind = fillCatalogKind(fill);
    if (!isShareKind(kind)) continue;
    const item = itemByFill(input.items, fill);
    if (!item?.name.trim()) continue;
    const slot: ShareSlot = {
      slotId: fill.slotId,
      catalogKind: kind,
      name: item.name.trim(),
    };
    if (item.type) slot.type = item.type;
    if (fill.quality) slot.quality = fill.quality;
    if (fill.mark) slot.mark = fill.mark;
    if (fill.abilityRank != null) slot.abilityRank = fill.abilityRank;
    slots.push(slot);
  }
  return {
    v: SHARE_SCHEMA_VERSION,
    shipName: input.shipName.trim(),
    title: input.title.trim() || "Build",
    slots,
    ...(input.loadout.boffSeatCareers
      ? { boffSeatCareers: { ...input.loadout.boffSeatCareers } }
      : {}),
  };
}

export function shareItemKey(
  catalogKind: ShareCatalogKind,
  name: string,
  type?: string | null,
): string {
  return `${catalogKind}\0${name.trim()}\0${(type ?? "").trim()}`;
}

export function resolveShareSlots(
  payload: SharePayload,
  items: ReadonlyArray<ShareCatalogItem>,
): { slots: LoadoutSlotFill[]; unresolved: string[] } {
  const byKey = new Map<string, ShareCatalogItem[]>();
  for (const item of items) {
    const kind = item.catalogKind ?? "item";
    if (!isShareKind(kind)) continue;
    const key = shareItemKey(kind, item.name, item.type);
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
    const nameOnly = shareItemKey(kind, item.name, null);
    if (nameOnly !== key) {
      const loose = byKey.get(nameOnly) ?? [];
      loose.push(item);
      byKey.set(nameOnly, loose);
    }
  }

  const slots: LoadoutSlotFill[] = [];
  const unresolved: string[] = [];
  for (const slot of payload.slots) {
    const exact = byKey.get(shareItemKey(slot.catalogKind, slot.name, slot.type));
    const loose = byKey.get(shareItemKey(slot.catalogKind, slot.name, null));
    const match = exact?.[0] ?? (loose && loose.length === 1 ? loose[0] : undefined);
    if (!match) {
      unresolved.push(slot.name);
      continue;
    }
    const fill: LoadoutSlotFill = {
      slotId: slot.slotId,
      itemId: match.id,
      catalogKind: slot.catalogKind,
    };
    if (slot.quality) fill.quality = slot.quality;
    if (slot.mark) fill.mark = slot.mark;
    if (slot.abilityRank != null) fill.abilityRank = slot.abilityRank;
    slots.push(fill);
  }
  return { slots, unresolved };
}

export function shareOwnershipKeys(
  fills: readonly LoadoutSlotFill[],
): string[] {
  return fills.map((fill) =>
    loadoutOwnershipKey(fillCatalogKind(fill), fill.itemId),
  );
}
