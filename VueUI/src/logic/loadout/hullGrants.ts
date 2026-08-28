import { loadoutOwnershipKey } from "./setBonus";

export type HullGrantShip = {
  id: number;
  uniconsole?: string | null;
  uniconsoleId?: number | null;
};

export type HullGrantTrait = {
  id: number;
  ships?: ReadonlyArray<{ id: number }>;
};

export type HullGrantItem = {
  id: number;
  name: string;
};

function normalizeGrantName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Unique consoles come with collected hulls; they are not a separate item collect. */
export function uniqueConsoleIdsFromOwnedShips(
  ships: ReadonlyArray<HullGrantShip>,
  ownedShipIds: ReadonlySet<number>,
  items: ReadonlyArray<HullGrantItem> = [],
): number[] {
  const ids = new Set<number>();
  const itemIdByName = new Map(
    items.map((item) => [normalizeGrantName(item.name), item.id]),
  );
  for (const ship of ships) {
    if (!ownedShipIds.has(ship.id)) continue;
    if (ship.uniconsoleId != null) {
      ids.add(ship.uniconsoleId);
      continue;
    }
    const named = ship.uniconsole?.trim();
    if (!named) continue;
    const fromName = itemIdByName.get(normalizeGrantName(named));
    if (fromName != null) ids.add(fromName);
  }
  return [...ids];
}

/** Starship traits granted by any collected hull. */
export function starshipTraitIdsFromOwnedShips(
  traits: ReadonlyArray<HullGrantTrait>,
  ownedShipIds: ReadonlySet<number>,
): number[] {
  return traits
    .filter((trait) =>
      (trait.ships ?? []).some((ship) => ownedShipIds.has(ship.id)),
    )
    .map((trait) => trait.id);
}

export function ownedKeysIncludingHullGrants(input: {
  ownedItemIds: Iterable<number>;
  ownedTraitIds: Iterable<number>;
  ownedShipIds: ReadonlySet<number>;
  ships: ReadonlyArray<HullGrantShip>;
  traits?: ReadonlyArray<HullGrantTrait>;
  items?: ReadonlyArray<HullGrantItem>;
}): Set<string> {
  const keys = new Set<string>();
  for (const id of input.ownedItemIds) {
    keys.add(loadoutOwnershipKey("item", id));
  }
  for (const id of input.ownedTraitIds) {
    keys.add(loadoutOwnershipKey("starshipTrait", id));
  }
  for (const id of uniqueConsoleIdsFromOwnedShips(
    input.ships,
    input.ownedShipIds,
    input.items ?? [],
  )) {
    keys.add(loadoutOwnershipKey("item", id));
  }
  for (const id of starshipTraitIdsFromOwnedShips(
    input.traits ?? [],
    input.ownedShipIds,
  )) {
    keys.add(loadoutOwnershipKey("starshipTrait", id));
  }
  return keys;
}
