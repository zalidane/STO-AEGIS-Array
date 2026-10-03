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
  displayClass?: string | null;
  displayType?: string | null;
  tier?: number | null;
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

/**
 * Career words lead wiki display types ("Tactical Miracle Worker Cruiser")
 * but the family players recognize drops them ("Miracle Worker Cruiser").
 */
const LEADING_ROLE =
  /^(?:Tactical|Science|Operations|Engineering)\s+/i;

/**
 * Faction hulls share a family and spell the last noun differently
 * (Cruiser / Warbird, Escort / Raptor). A replacement is used only when
 * another granting hull already has that wording, so a lone "Warbird"
 * is not renamed into a false cruiser family.
 */
const FACTION_HULL_TAILS: ReadonlyArray<readonly [RegExp, string]> = [
  [/heavy warbird$/i, "Battlecruiser"],
  [/command warbird$/i, "Command Battlecruiser"],
  [/war command battlecruiser$/i, "Command Battlecruiser"],
  [/science destroyer warbird$/i, "Science Destroyer"],
  [/dreadnought warbird$/i, "Dreadnought Cruiser"],
  [/warbird battlecruiser$/i, "Battlecruiser"],
  [/advanced light warbird battlecruiser$/i, "Advanced Light Cruiser"],
  [/pilot warbird$/i, "Pilot Escort"],
  [/pilot raptor$/i, "Pilot Escort"],
  [/research warbird$/i, "Research Vessel"],
  [/flight deck raptor$/i, "Flight Deck Carrier"],
  [/carrier warbird$/i, "Carrier"],
  [/raptor$/i, "Escort"],
  [/warbird$/i, "Cruiser"],
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Display type with the leading career word removed, else the name minus class. */
function familyType(ship: ConsoleSourceShip): string {
  const typed = plain(ship.displayType);
  const source = typed || nameWithoutIdentity(ship);
  return source.replace(LEADING_ROLE, "").trim();
}

function nameWithoutIdentity(ship: ConsoleSourceShip): string {
  let name = plain(ship.name);
  const prefix = plain(ship.displayPrefix);
  const klass = plain(ship.displayClass);
  if (prefix) {
    name = name.replace(new RegExp(`^${escapeRegExp(prefix)}\\s+`, "i"), "");
  }
  if (klass) {
    name = name.replace(new RegExp(`\\b${escapeRegExp(klass)}\\b`, "i"), " ");
  }
  return name.replace(/\bclass\b/gi, " ").replace(/\s+/g, " ").trim();
}

function unifyFamilyType(type: string, siblings: readonly string[]): string {
  for (const [pattern, replacement] of FACTION_HULL_TAILS) {
    if (!pattern.test(type)) continue;
    const replaced = type.replace(pattern, replacement).replace(/\s+/g, " ").trim();
    const match = siblings.find(
      (sibling) => sibling.toLowerCase() === replaced.toLowerCase(),
    );
    if (match) return match;
  }
  return type;
}

function tierSuffix(tier: number | null | undefined): string {
  if (tier == null || !Number.isInteger(tier) || tier <= 0) return "";
  return ` [T${tier}]`;
}

function familyLabel(
  prefix: string,
  type: string,
  tier: number | null | undefined,
): string {
  const core = [prefix, type].filter(Boolean).join(" ");
  if (!core) return "";
  return `${core}${tierSuffix(tier)}`;
}

/**
 * Several granting hulls collapse to family + tier.
 * Tucker / Klothos / Tebok → "Miracle Worker Cruiser [T6]".
 * Hulls that are not the same family stay as separate labels.
 */
function summarizeShipFamilies(ships: readonly ConsoleSourceShip[]): string | null {
  const described = ships.map((ship) => ({
    prefix: plain(ship.displayPrefix),
    type: familyType(ship),
    tier: ship.tier,
  }));
  const labels: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < described.length; index += 1) {
    const row = described[index];
    if (!row) continue;
    const siblings = described
      .filter((_, siblingIndex) => siblingIndex !== index)
      .map((sibling) => sibling.type);
    const type = unifyFamilyType(row.type, siblings);
    const label = familyLabel(row.prefix, type, row.tier);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  labels.sort((left, right) => left.localeCompare(right));
  return labels.length > 0 ? labels.join(META_SEPARATOR) : null;
}

function sourceLabel(
  item: ConsoleSourceItem,
  index: GrantIndex,
): string | null {
  if (!isConsoleCatalogItem(item)) return null;
  const ships = grantingShipsForConsole(item, index);
  if (ships.length === 0) return null;
  // One hull keeps the short display name from #71, with no tier suffix.
  if (ships.length === 1) {
    const only = ships[0];
    const label = only ? shortShipDisplayName(only) : "";
    return label || null;
  }
  return summarizeShipFamilies(ships);
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
