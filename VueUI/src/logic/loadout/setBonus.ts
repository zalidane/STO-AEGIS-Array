import { itemFitsSlot } from "./slotClass";
import type {
  CollectionLoadout,
  LoadoutCatalogKind,
  LoadoutItem,
  LoadoutSlotFill,
} from "./types";

export type SetBonusSource = {
  id: number;
  name: string;
  reqItems: number | null;
  passives: string | null;
};

export type ActiveSetBonus = {
  id: number;
  name: string;
  equipped: number;
  required: number;
  complete: boolean;
  passives: string | null;
};

const MIN_SET_NAME_LENGTH = 6;

function catalogByKey(
  items: ReadonlyArray<LoadoutItem>,
): Map<string, LoadoutItem> {
  return new Map(
    items.map((item) => [
      loadoutOwnershipKey(item.catalogKind, item.id),
      item,
    ]),
  );
}

export function seatedLoadoutItems(
  loadout: CollectionLoadout | null | undefined,
  items: ReadonlyArray<LoadoutItem>,
): LoadoutItem[] {
  if (!loadout) return [];
  const byKey = catalogByKey(items);
  return loadout.slots
    .map((fill) => byKey.get(loadoutOwnershipKey(fill.catalogKind, fill.itemId)))
    .filter((item): item is LoadoutItem => item != null);
}

export function equippedItemsForLoadout(
  loadout: CollectionLoadout | null | undefined,
  items: ReadonlyArray<LoadoutItem>,
): LoadoutItem[] {
  return seatedLoadoutItems(loadout, items).filter(
    (item) => (item.catalogKind ?? "item") === "item",
  );
}

export function itemBelongsToSet(itemName: string, setName: string): boolean {
  const item = itemName.trim().toLowerCase();
  const set = setName.trim().toLowerCase();
  if (!item || set.length < MIN_SET_NAME_LENGTH) return false;
  return item.includes(set);
}

/**
 * Count equipped pieces whose names contain the set name.
 * Wiki has no item↔set FK; this is a name heuristic for the builder.
 */
export function matchSetBonuses(
  equipped: ReadonlyArray<Pick<LoadoutItem, "name">>,
  sets: ReadonlyArray<SetBonusSource>,
): ActiveSetBonus[] {
  const names = equipped.map((item) => item.name);
  return sets
    .map((set) => {
      const equippedCount = names.filter((name) =>
        itemBelongsToSet(name, set.name),
      ).length;
      const required = set.reqItems != null && set.reqItems > 0 ? set.reqItems : 3;
      return {
        id: set.id,
        name: set.name,
        equipped: equippedCount,
        required,
        complete: equippedCount >= required,
        passives: set.passives,
      };
    })
    .filter((set) => set.equipped >= 2)
    .sort((a, b) => b.equipped - a.equipped || a.name.localeCompare(b.name));
}

export function isUniqueLimited(item: Pick<LoadoutItem, "equiplimit">): boolean {
  return item.equiplimit != null && item.equiplimit > 0;
}

export function loadoutOwnershipKey(
  catalogKind: LoadoutCatalogKind | undefined,
  itemId: number,
): string {
  return `${catalogKind ?? "item"}:${itemId}`;
}

export function fillCatalogKind(
  fill: Pick<LoadoutSlotFill, "catalogKind">,
): LoadoutCatalogKind {
  return fill.catalogKind ?? "item";
}

export function copiesAllowed(item: Pick<LoadoutItem, "equiplimit">): number {
  if (!isUniqueLimited(item)) return Number.POSITIVE_INFINITY;
  return item.equiplimit!;
}

export function countCopiesInLoadout(
  loadout: CollectionLoadout,
  itemId: number,
  exceptSlotId?: string,
  catalogKind: LoadoutCatalogKind = "item",
): number {
  return loadout.slots.filter(
    (fill) =>
      fill.itemId === itemId &&
      fillCatalogKind(fill) === catalogKind &&
      fill.slotId !== exceptSlotId,
  ).length;
}

export function itemFitsHullSlot(
  item: Pick<LoadoutItem, "type">,
  slotKind: Parameters<typeof itemFitsSlot>[1],
): boolean {
  return itemFitsSlot(item.type, slotKind);
}
