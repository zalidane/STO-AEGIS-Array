import { slotForGrantedConsole, type HullSlot } from "@/logic/loadout/hullSlots";
import type { LoadoutItem } from "@/logic/loadout/types";

export type HullGrantEquip = {
  slotId: string;
  itemId: number;
};

export type HullGrantShip = {
  uniconsoleId?: number | null;
  uniConsole?: { id: number } | null;
  experimentalWeaponId?: number | null;
  experimentalWeaponItem?: { id: number } | null;
};

export type HullGrantLoadout = {
  slots: ReadonlyArray<{ slotId: string; itemId: number }>;
};

function catalogItem(
  catalog: ReadonlyArray<LoadoutItem>,
  itemId: number,
): LoadoutItem | undefined {
  return catalog.find(
    (row) => row.id === itemId && (row.catalogKind ?? "item") === "item",
  );
}

function alreadySeated(
  loadout: HullGrantLoadout,
  slotId: string,
  itemId: number,
): boolean {
  return loadout.slots.some(
    (fill) => fill.slotId === slotId && fill.itemId === itemId,
  );
}

/**
 * Unique-console and experimental-weapon grants to seat on a new loadout.
 * `waiting` is true when a grant id exists but the catalog row is not loaded yet.
 */
export function pendingHullGrantEquips(input: {
  ship: HullGrantShip | null | undefined;
  hullSlots: ReadonlyArray<HullSlot>;
  loadout: HullGrantLoadout;
  catalog: ReadonlyArray<LoadoutItem>;
}): { equips: HullGrantEquip[]; waiting: boolean } {
  const equips: HullGrantEquip[] = [];
  let waiting = false;
  const ship = input.ship;
  if (!ship) return { equips, waiting };

  const queue = (
    itemId: number | null | undefined,
    slot: HullSlot | undefined,
  ) => {
    if (itemId == null || slot == null) return;
    if (alreadySeated(input.loadout, slot.id, itemId)) return;
    if (!catalogItem(input.catalog, itemId)) {
      waiting = true;
      return;
    }
    equips.push({ slotId: slot.id, itemId });
  };

  const consoleId = ship.uniconsoleId ?? ship.uniConsole?.id;
  if (consoleId != null) {
    const unique = catalogItem(input.catalog, consoleId);
    queue(
      consoleId,
      unique
        ? (slotForGrantedConsole(input.hullSlots, unique.type) ?? undefined)
        : input.hullSlots.find((row) => row.kind === "universalConsole"),
    );
  }

  const weaponId =
    ship.experimentalWeaponId ?? ship.experimentalWeaponItem?.id;
  queue(
    weaponId,
    input.hullSlots.find((row) => row.kind === "experimental"),
  );

  return { equips, waiting };
}
