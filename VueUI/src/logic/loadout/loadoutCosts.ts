import { parseShipCost, type ShipCost } from "@/utils/parsers/shipCost";
import { loadoutOwnershipKey } from "./setBonus";
import type { LoadoutCatalogKind, LoadoutItem, LoadoutSlotFill } from "./types";

export type LoadoutCostShip = {
  id: number;
  cost?: string | null;
  uniconsole?: string | null;
  uniconsoleId?: number | null;
  experimentalWeapon?: string | null;
  experimentalWeaponId?: number | null;
};

export type LoadoutCostTrait = {
  id: number;
  ships?: ReadonlyArray<{ id: number; cost?: string | null }>;
};

export type LoadoutCostItem = {
  id: number;
  name: string;
  catalogKind?: LoadoutCatalogKind;
  who?: string | null;
};

export type AggregatedCostLine = {
  currencyCode: string;
  label: string;
  color: string;
  amount: number;
};

export type LoadoutCostSummary = {
  collected: AggregatedCostLine[];
  notCollected: AggregatedCostLine[];
};

function normalizeName(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseAmount(amount: string): number {
  const parsed = Number.parseFloat(amount.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function cheapestShip(
  ships: ReadonlyArray<LoadoutCostShip>,
): LoadoutCostShip | null {
  if (ships.length === 0) return null;
  return ships.reduce((best, ship) => {
    const bestTotal = parseShipCost(best.cost).reduce(
      (sum, part) => sum + parseAmount(part.amount),
      0,
    );
    const total = parseShipCost(ship.cost).reduce(
      (sum, part) => sum + parseAmount(part.amount),
      0,
    );
    return total < bestTotal ? ship : best;
  });
}

function pickGrantingShip(
  candidates: ReadonlyArray<LoadoutCostShip>,
  ownedShipIds: ReadonlySet<number>,
): LoadoutCostShip | null {
  const owned = candidates.filter((ship) => ownedShipIds.has(ship.id));
  return cheapestShip(owned.length > 0 ? owned : candidates);
}

function grantingShipsForConsole(
  item: LoadoutCostItem,
  ships: ReadonlyArray<LoadoutCostShip>,
): LoadoutCostShip[] {
  const name = normalizeName(item.name);
  return ships.filter((ship) => {
    if (ship.uniconsoleId === item.id) return true;
    if (ship.experimentalWeaponId === item.id) return true;
    const listedConsole = ship.uniconsole?.trim();
    if (listedConsole != null && listedConsole !== "" && normalizeName(listedConsole) === name) {
      return true;
    }
    const listedWeapon = ship.experimentalWeapon?.trim();
    return (
      listedWeapon != null &&
      listedWeapon !== "" &&
      normalizeName(listedWeapon) === name
    );
  });
}

function grantingShipsForTrait(
  item: LoadoutCostItem,
  traits: ReadonlyArray<LoadoutCostTrait>,
  ships: ReadonlyArray<LoadoutCostShip>,
): LoadoutCostShip[] {
  const trait = traits.find((row) => row.id === item.id);
  if (!trait) return [];
  const byId = new Map(ships.map((ship) => [ship.id, ship]));
  return (trait.ships ?? [])
    .map((row) => {
      const known = byId.get(row.id);
      if (known) return known;
      return { id: row.id, cost: row.cost ?? null };
    })
    .filter((ship): ship is LoadoutCostShip => ship != null);
}

function costPartsFromWho(who: string | null | undefined): ShipCost[] {
  const parsed = parseShipCost(who);
  if (parsed.length > 0) return parsed;
  const text = who?.toLowerCase() ?? "";
  if (!text) return [];
  if (text.includes("lock box")) return parseShipCost("1;LB");
  if (text.includes("phoenix")) return parseShipCost("1;PPP5");
  if (/\blobi\b/.test(text)) return parseShipCost("1;LC");
  return [];
}

function costsForItem(
  item: LoadoutCostItem,
  ships: ReadonlyArray<LoadoutCostShip>,
  traits: ReadonlyArray<LoadoutCostTrait>,
  ownedShipIds: ReadonlySet<number>,
): { parts: ShipCost[]; sourceShipId: number | null } {
  const kind = item.catalogKind ?? "item";
  if (kind === "trait") {
    return { parts: costPartsFromWho(item.who), sourceShipId: null };
  }
  const grantShips =
    kind === "starshipTrait"
      ? grantingShipsForTrait(item, traits, ships)
      : grantingShipsForConsole(item, ships);
  const grant = pickGrantingShip(grantShips, ownedShipIds);
  if (grant) {
    return { parts: parseShipCost(grant.cost), sourceShipId: grant.id };
  }
  return { parts: parseShipCost(item.who), sourceShipId: null };
}

function addParts(
  bucket: Map<string, AggregatedCostLine>,
  parts: readonly ShipCost[],
) {
  for (const part of parts) {
    const existing = bucket.get(part.currencyCode);
    const amount = parseAmount(part.amount);
    if (existing) {
      existing.amount += amount;
      continue;
    }
    bucket.set(part.currencyCode, {
      currencyCode: part.currencyCode,
      label: part.label,
      color: part.color,
      amount,
    });
  }
}

function linesFrom(bucket: Map<string, AggregatedCostLine>): AggregatedCostLine[] {
  return [...bucket.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Unique catalog items seated on this hull loadout or the captain trait board.
 */
export function seatedItemsForCosts(input: {
  loadout?: { slots: ReadonlyArray<LoadoutSlotFill> } | null;
  captainFills?: ReadonlyArray<LoadoutSlotFill> | null;
  items: ReadonlyArray<LoadoutItem>;
}): LoadoutItem[] {
  const byKey = new Map(
    input.items.map((item) => [
      loadoutOwnershipKey(item.catalogKind, item.id),
      item,
    ]),
  );
  const seated: LoadoutItem[] = [];
  const seen = new Set<string>();
  for (const fill of [
    ...(input.loadout?.slots ?? []),
    ...(input.captainFills ?? []),
  ]) {
    const key = loadoutOwnershipKey(fill.catalogKind, fill.itemId);
    if (seen.has(key)) continue;
    const item = byKey.get(key);
    if (!item) continue;
    seen.add(key);
    seated.push(item);
  }
  return seated;
}

/**
 * Acquisition costs for seated loadout pieces, split by collection.
 * Unique consoles and starship traits inherit granting-ship cost; personal
 * traits use wiki `source` (including lock box / Phoenix / Lobi hints);
 * other items use wiki `who` when it matches amount;CODE. A granting ship
 * is counted once even if both its console and trait are seated.
 */
export function aggregateLoadoutCosts(input: {
  seated: ReadonlyArray<LoadoutCostItem>;
  ownedKeys: ReadonlySet<string>;
  ownedShipIds: ReadonlySet<number>;
  ships: ReadonlyArray<LoadoutCostShip>;
  traits?: ReadonlyArray<LoadoutCostTrait>;
}): LoadoutCostSummary {
  const collected = new Map<string, AggregatedCostLine>();
  const notCollected = new Map<string, AggregatedCostLine>();
  const countedShips = { collected: new Set<number>(), notCollected: new Set<number>() };
  const traits = input.traits ?? [];

  for (const item of input.seated) {
    const owned = input.ownedKeys.has(
      loadoutOwnershipKey(item.catalogKind, item.id),
    );
    const { parts, sourceShipId } = costsForItem(
      item,
      input.ships,
      traits,
      input.ownedShipIds,
    );
    if (parts.length === 0) continue;

    const bucket = owned ? collected : notCollected;
    const seen = owned ? countedShips.collected : countedShips.notCollected;
    if (sourceShipId != null) {
      if (seen.has(sourceShipId)) continue;
      seen.add(sourceShipId);
    }
    addParts(bucket, parts);
  }

  return {
    collected: linesFrom(collected),
    notCollected: linesFrom(notCollected),
  };
}

export function formatAggregatedAmount(amount: number): string {
  return Number.isInteger(amount)
    ? amount.toLocaleString("en-US")
    : amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function splitShipAbilities(
  abilities: string | null | undefined,
): string[] {
  if (!abilities?.trim()) return [];
  return abilities
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
