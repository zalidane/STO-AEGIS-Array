import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import { loadoutOwnershipKey } from "@/logic/loadout/setBonus";
import {
  itemSlotClassesFromType,
  type ItemSlotClass,
} from "@/logic/loadout/slotClass";
import type { LoadoutCatalogKind } from "@/logic/loadout/types";

/** Same separator the Equip picker uses between metadata fields. */
const META_SEPARATOR = " · ";

const CONSOLE_SLOT_CLASSES = new Set<ItemSlotClass>([
  "tacticalConsole",
  "engineeringConsole",
  "scienceConsole",
  "universalConsole",
]);

export type ConsoleSourceShip = {
  id: number;
  name: string;
  displayPrefix?: string | null;
  displayType?: string | null;
  uniconsole?: string | null;
  uniconsoleId?: number | null;
};

export type ConsoleSourceItem = {
  id: number;
  name: string;
  type?: string | null;
  catalogKind?: LoadoutCatalogKind | null;
};

function plain(value: string | null | undefined): string {
  if (!value) return "";
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function normalizeCatalogName(value: string | null | undefined): string {
  return plain(value).toLowerCase();
}

/**
 * Player-facing hull name from display prefix and display type.
 * Example: prefix Bajoran + type Interceptor → Bajoran Interceptor.
 * Hulls missing either field keep the catalog name.
 */
export function shortShipDisplayName(
  ship: Pick<ConsoleSourceShip, "name" | "displayPrefix" | "displayType">,
): string {
  const prefix = plain(ship.displayPrefix);
  const type = plain(ship.displayType);
  if (prefix && type) return `${prefix} ${type}`;
  return plain(ship.name);
}

function isConsoleCatalogItem(item: ConsoleSourceItem): boolean {
  if ((item.catalogKind ?? "item") !== "item") return false;
  return itemSlotClassesFromType(item.type).some((slotClass) =>
    CONSOLE_SLOT_CLASSES.has(slotClass),
  );
}

type GrantIndex = {
  byId: Map<number, ConsoleSourceShip[]>;
  byName: Map<string, ConsoleSourceShip[]>;
};

function indexGrantingShips(ships: readonly ConsoleSourceShip[]): GrantIndex {
  const byId = new Map<number, ConsoleSourceShip[]>();
  const byName = new Map<string, ConsoleSourceShip[]>();
  for (const ship of ships) {
    if (ship.uniconsoleId != null) {
      const linked = byId.get(ship.uniconsoleId) ?? [];
      linked.push(ship);
      byId.set(ship.uniconsoleId, linked);
    }
    const listed = normalizeCatalogName(ship.uniconsole);
    if (!listed) continue;
    const named = byName.get(listed) ?? [];
    named.push(ship);
    byName.set(listed, named);
  }
  return { byId, byName };
}

function grantingShipsForConsole(
  item: ConsoleSourceItem,
  index: GrantIndex,
): ConsoleSourceShip[] {
  const seen = new Set<number>();
  const matches: ConsoleSourceShip[] = [];
  const add = (ship: ConsoleSourceShip) => {
    if (seen.has(ship.id)) return;
    seen.add(ship.id);
    matches.push(ship);
  };
  for (const ship of index.byId.get(item.id) ?? []) add(ship);
  for (const ship of index.byName.get(normalizeCatalogName(item.name)) ?? []) {
    add(ship);
  }
  return matches;
}

function sourceLabel(
  item: ConsoleSourceItem,
  index: GrantIndex,
): string | null {
  if (!isConsoleCatalogItem(item)) return null;
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const ship of grantingShipsForConsole(item, index)) {
    const label = shortShipDisplayName(ship);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.length > 0 ? labels.join(META_SEPARATOR) : null;
}

/** Source text for one console, or null when the catalog has none. */
export function consolePickerSource(
  item: ConsoleSourceItem,
  ships: readonly ConsoleSourceShip[],
): string | null {
  return sourceLabel(item, indexGrantingShips(ships));
}

/** Ownership key → source, only for consoles the catalog can place. */
export function consoleSourceLabels(
  items: readonly ConsoleSourceItem[],
  ships: readonly ConsoleSourceShip[],
): Map<string, string> {
  const index = indexGrantingShips(ships);
  const labels = new Map<string, string>();
  for (const item of items) {
    const label = sourceLabel(item, index);
    if (!label) continue;
    labels.set(loadoutOwnershipKey(item.catalogKind ?? undefined, item.id), label);
  }
  return labels;
}
