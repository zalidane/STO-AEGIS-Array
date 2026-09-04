import { parseShipCost, shipHasCurrencyCode } from "@/utils/parsers/shipCost";

export const BINDER_SIDE_SIZE = 9;
export const BINDER_PAGE_SIZE = BINDER_SIDE_SIZE * 2;
export const SHIPS_LIST_STATE_KEY = "sto-aegis:ships-list-state";
export const COLLECTION_SHIPS_FILTERS_KEY = "sto-aegis:collection-ships-filters";

export type ShipListItem = {
  id: number;
  name: string;
  type: string | null;
  tier: number | null;
  faction: string | null;
  factionLede: string | null;
  facSort?: string | null;
  displayClass?: string | null;
  displayPrefix?: string | null;
  displayType?: string | null;
  cost?: string | null;
};

export type ShipsListFilters = {
  search: string;
  types: string[];
  factions: string[];
  tiers: number[];
  costs: string[];
  hideCollected?: boolean;
  hideFleet?: boolean;
};

export type ShipsListState = ShipsListFilters & {
  page: number;
};

export type BinderPage<T> = {
  left: T[];
  right: T[];
  totalPages: number;
  page: number;
};

/** Toggle a value in an inclusive multi-select list. */
export function toggleInclusiveValue<T>(selected: readonly T[], value: T): T[] {
  const index = selected.indexOf(value);
  if (index >= 0) {
    return selected.filter((_, i) => i !== index);
  }
  return [...selected, value];
}

export function uniqueSortedStrings(
  values: readonly (string | null | undefined)[],
): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function uniqueSortedTiers(
  values: readonly (number | null | undefined)[],
): number[] {
  const set = new Set<number>();
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      set.add(value);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function matchesSearch(ship: ShipListItem, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  const costParts = parseShipCost(ship.cost);
  const haystack = [
    ship.name,
    ship.type,
    ship.faction,
    ship.factionLede,
    ship.displayClass,
    ship.displayType,
    ship.tier != null ? `tier ${ship.tier}` : null,
    ship.tier != null ? `t${ship.tier}` : null,
    ...costParts.map((cost) => cost.label),
    ...costParts.map((cost) => cost.currencyCode),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function matchesCost(ship: ShipListItem, costs: readonly string[]): boolean {
  if (costs.length === 0) return true;
  return costs.some((code) => shipHasCurrencyCode(ship.cost, code));
}

function matchesType(ship: ShipListItem, types: readonly string[]): boolean {
  if (types.length === 0) return true;
  return ship.type != null && types.includes(ship.type);
}

function matchesTier(ship: ShipListItem, tiers: readonly number[]): boolean {
  if (tiers.length === 0) return true;
  return ship.tier != null && tiers.includes(ship.tier);
}

/** Fleet hulls use a Fleet display prefix or the word "Fleet" in the name. */
export function isFleetShip(
  ship: Pick<ShipListItem, "name" | "displayPrefix">,
): boolean {
  const prefix = ship.displayPrefix?.trim().toLowerCase();
  if (prefix === "fleet") return true;
  return /\bfleet\b/i.test(ship.name);
}

function parseBoolFlag(value: unknown): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === true || raw === 1) return true;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
}

const EMPTY_COLLECTED_IDS: ReadonlySet<number> = new Set();

/** True when a ship is affiliated with any of the selected faction filters. */
export function shipMatchesFaction(
  ship: ShipListItem,
  factions: readonly string[],
): boolean {
  if (factions.length === 0) return false;

  const lede = ship.factionLede?.trim();
  if (lede && factions.includes(lede)) return true;

  const shipFactions = (ship.faction ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return factions.some((faction) =>
    shipFactions.some(
      (shipFaction) =>
        shipFaction === faction ||
        shipFaction.toLowerCase().includes(faction.toLowerCase()) ||
        faction.toLowerCase().includes(shipFaction.toLowerCase()),
    ),
  );
}

/**
 * Stable priority score for faction prominence.
 * Lower score sorts earlier. Primary lede match beats shared faction lists.
 */
export function factionPriorityScore(
  ship: ShipListItem,
  factions: readonly string[],
): number {
  if (factions.length === 0) return 1;

  const lede = ship.factionLede?.trim();
  if (lede && factions.includes(lede)) return 0;

  if (shipMatchesFaction(ship, factions)) return 1;

  return 2;
}

/** Keep selected-faction ships first while preserving relative order. */
export function prioritizeShipsByFaction<T extends ShipListItem>(
  ships: readonly T[],
  factions: readonly string[],
): T[] {
  if (factions.length === 0) return [...ships];

  return ships
    .map((ship, index) => ({ ship, index }))
    .sort((left, right) => {
      const scoreDelta =
        factionPriorityScore(left.ship, factions) -
        factionPriorityScore(right.ship, factions);
      if (scoreDelta !== 0) return scoreDelta;
      return left.index - right.index;
    })
    .map(({ ship }) => ship);
}

/**
 * Apply search / type / tier filters, then promote selected-faction ships.
 * Faction is a sort priority (not an exclude filter) so every vessel remains
 * available while the chosen faction is shown first.
 */
export function filterShips<T extends ShipListItem>(
  ships: readonly T[],
  filters: ShipsListFilters,
  collectedIds: ReadonlySet<number> = EMPTY_COLLECTED_IDS,
): T[] {
  const filtered = ships.filter((ship) => {
    if (!matchesSearch(ship, filters.search)) return false;
    if (!matchesType(ship, filters.types)) return false;
    if (!matchesTier(ship, filters.tiers)) return false;
    if (!matchesCost(ship, filters.costs ?? [])) return false;
    if (filters.hideCollected && collectedIds.has(ship.id)) return false;
    if (filters.hideFleet && isFleetShip(ship)) return false;
    return true;
  });

  return prioritizeShipsByFaction(filtered, filters.factions);
}

/**
 * Filter any row list by mapping each row onto a ship catalog item.
 * Faction chips still promote rather than exclude, matching the registry.
 */
export function filterItemsByShip<T>(
  items: readonly T[],
  toShip: (item: T) => ShipListItem,
  filters: ShipsListFilters,
  collectedIds: ReadonlySet<number> = EMPTY_COLLECTED_IDS,
): T[] {
  const tagged = items.map((item, index) => ({
    ...toShip(item),
    __item: item,
    __index: index,
  }));
  return filterShips(tagged, filters, collectedIds).map((row) => row.__item);
}

export function shipsListFiltersAreActive(filters: ShipsListFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.types.length > 0 ||
    filters.factions.length > 0 ||
    filters.tiers.length > 0 ||
    (filters.costs?.length ?? 0) > 0 ||
    Boolean(filters.hideCollected) ||
    Boolean(filters.hideFleet)
  );
}

export function getBinderPageCount(itemCount: number): number {
  if (itemCount <= 0) return 1;
  return Math.ceil(itemCount / BINDER_PAGE_SIZE);
}

export function clampBinderPage(page: number, itemCount: number): number {
  const totalPages = getBinderPageCount(itemCount);
  if (!Number.isFinite(page) || page < 1) return 1;
  if (page > totalPages) return totalPages;
  return Math.floor(page);
}

export function getBinderPage<T>(
  items: readonly T[],
  page: number,
): BinderPage<T> {
  const safePage = clampBinderPage(page, items.length);
  const start = (safePage - 1) * BINDER_PAGE_SIZE;
  const pageItems = items.slice(start, start + BINDER_PAGE_SIZE);

  return {
    left: pageItems.slice(0, BINDER_SIDE_SIZE),
    right: pageItems.slice(BINDER_SIDE_SIZE, BINDER_PAGE_SIZE),
    totalPages: getBinderPageCount(items.length),
    page: safePage,
  };
}

function parseCsv(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseTierCsv(value: unknown): number[] {
  return parseCsv(value)
    .map((part) => Number(part))
    .filter((tier) => Number.isFinite(tier));
}

export function createDefaultShipsListState(): ShipsListState {
  return {
    search: "",
    types: [],
    factions: [],
    tiers: [],
    costs: [],
    hideCollected: false,
    hideFleet: false,
    page: 1,
  };
}

export function createDefaultShipsListFilters(): ShipsListFilters {
  const { page: _page, ...filters } = createDefaultShipsListState();
  return filters;
}

export function shipsListFiltersFromState(
  state: ShipsListState,
): ShipsListFilters {
  const { page: _page, ...filters } = state;
  return filters;
}

export function parseShipsListQuery(
  query: Record<string, unknown>,
): ShipsListState {
  const pageRaw = Number(query.page);
  return {
    search: typeof query.q === "string" ? query.q : "",
    types: uniqueSortedStrings(parseCsv(query.type)),
    factions: uniqueSortedStrings(parseCsv(query.faction)),
    tiers: uniqueSortedTiers(parseTierCsv(query.tier)),
    costs: uniqueSortedStrings(parseCsv(query.cost)),
    hideCollected: parseBoolFlag(query.hideCollected),
    hideFleet: parseBoolFlag(query.hideFleet),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
  };
}

export function serializeShipsListQuery(
  state: ShipsListState,
): Record<string, string> {
  const query: Record<string, string> = {};
  const search = state.search.trim();
  if (search) query.q = search;
  if (state.types.length > 0) query.type = [...state.types].sort().join(",");
  if (state.factions.length > 0) {
    query.faction = [...state.factions].sort().join(",");
  }
  if (state.tiers.length > 0) {
    query.tier = [...state.tiers].sort((a, b) => a - b).join(",");
  }
  if ((state.costs?.length ?? 0) > 0) {
    query.cost = [...state.costs].sort((a, b) => a.localeCompare(b)).join(",");
  }
  if (state.hideCollected) query.hideCollected = "1";
  if (state.hideFleet) query.hideFleet = "1";
  if (state.page > 1) query.page = String(state.page);
  return query;
}

export function shipsListQueryForAcquisition(input: {
  currencyCode: string;
  label: string;
}): Record<string, string> {
  return serializeShipsListQuery({
    ...createDefaultShipsListState(),
    search: input.label,
    costs: [input.currencyCode],
  });
}

export function shipsListQueryIsEmpty(
  query: Record<string, unknown>,
): boolean {
  return (
    !query.q &&
    !query.type &&
    !query.faction &&
    !query.tier &&
    !query.cost &&
    !query.hideCollected &&
    !query.hideFleet &&
    !query.page
  );
}

export function readStoredShipsListState(
  storage: Pick<Storage, "getItem"> = sessionStorage,
  key: string = SHIPS_LIST_STATE_KEY,
): ShipsListState | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShipsListState>;
    return {
      search: typeof parsed.search === "string" ? parsed.search : "",
      types: Array.isArray(parsed.types)
        ? uniqueSortedStrings(parsed.types.map(String))
        : [],
      factions: Array.isArray(parsed.factions)
        ? uniqueSortedStrings(parsed.factions.map(String))
        : [],
      tiers: Array.isArray(parsed.tiers)
        ? uniqueSortedTiers(parsed.tiers.map(Number))
        : [],
      costs: Array.isArray(parsed.costs)
        ? uniqueSortedStrings(parsed.costs.map(String))
        : [],
      hideCollected: parsed.hideCollected === true,
      hideFleet: parsed.hideFleet === true,
      page:
        typeof parsed.page === "number" && parsed.page > 0
          ? Math.floor(parsed.page)
          : 1,
    };
  } catch {
    return null;
  }
}

export function writeStoredShipsListState(
  state: ShipsListState,
  storage: Pick<Storage, "setItem"> = sessionStorage,
  key: string = SHIPS_LIST_STATE_KEY,
): void {
  storage.setItem(key, JSON.stringify(state));
}
