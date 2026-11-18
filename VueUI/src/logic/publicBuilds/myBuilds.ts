import { formatCombatDps, peakFightDps } from "@/logic/combatlog";
import type { CollectionLoadout } from "@/logic/loadout/types";
import {
  loadoutSeatRatio,
  type LoadoutSeatRatioCaptain,
  type LoadoutSeatRatioShip,
} from "@/logic/loadout/seatRatio";
import {
  PUBLIC_BUILDS_PAGE_SIZE,
  type PublicBuildSortValue,
} from "./queryState";

export type MyBuildShip = LoadoutSeatRatioShip & {
  id: number;
  name: string;
  image?: string | null;
  type?: string | null;
  tier?: number | null;
  faction?: string | null;
  factionLede?: string | null;
  displayPrefix?: string | null;
  displayClass?: string | null;
  displayType?: string | null;
};

export type MyBuildListItem = {
  id: string;
  title: string;
  shipId: number;
  shipName: string;
  ship: MyBuildShip | null;
  filled: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  peakDps: number;
  fightCount: number;
  peakDpsLabel: string;
  to: string;
};

export type MyBuildFacets = {
  factions: string[];
  tiers: number[];
  shipNames: string[];
};

export type MyBuildsConnection = {
  items: MyBuildListItem[];
  totalCount: number;
  offset: number;
  limit: number;
  facets: MyBuildFacets;
};

export type ListMyBuildsArgs = {
  loadouts: readonly CollectionLoadout[];
  ships: readonly MyBuildShip[];
  captain: LoadoutSeatRatioCaptain | null;
  search?: string | null;
  shipName?: string | null;
  faction?: string | null;
  tier?: number | null;
  sort?: PublicBuildSortValue | null;
  offset?: number | null;
  limit?: number | null;
};

function fallbackShipName(shipId: number): string {
  return `Ship #${shipId}`;
}

export function shipMatchesFactionFilter(
  ship: Pick<MyBuildShip, "faction" | "factionLede">,
  faction: string,
): boolean {
  const needle = faction.trim().toLowerCase();
  if (!needle) return true;
  const lede = ship.factionLede?.trim().toLowerCase() ?? "";
  if (lede && (lede === needle || lede.includes(needle) || needle.includes(lede))) {
    return true;
  }
  const parts = (ship.faction ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return parts.some(
    (part) => part === needle || part.includes(needle) || needle.includes(part),
  );
}

export function matchesMyBuildSearch(
  title: string,
  ship: Pick<
    MyBuildShip,
    "name" | "displayClass" | "displayPrefix" | "displayType"
  > | null,
  fallbackName: string,
  search: string,
): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    title,
    fallbackName,
    ship?.name,
    ship?.displayClass,
    ship?.displayPrefix,
    ship?.displayType,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function stamp(value: string): number {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function sortMyBuildItems(
  rows: readonly MyBuildListItem[],
  sort: PublicBuildSortValue,
): MyBuildListItem[] {
  const copy = [...rows];
  copy.sort((left, right) => {
    if (sort === "NAME") {
      const byTitle = left.title.localeCompare(right.title);
      if (byTitle !== 0) return byTitle;
      const byShip = left.shipName.localeCompare(right.shipName);
      if (byShip !== 0) return byShip;
      return left.id.localeCompare(right.id);
    }
    if (sort === "UPDATED") {
      const byUpdated = stamp(right.updatedAt) - stamp(left.updatedAt);
      if (byUpdated !== 0) return byUpdated;
      return left.id.localeCompare(right.id);
    }
    // NEWEST and FEATURED (local builds have no featured count).
    const byCreated = stamp(right.createdAt) - stamp(left.createdAt);
    if (byCreated !== 0) return byCreated;
    return left.id.localeCompare(right.id);
  });
  return copy;
}

function collectFacets(rows: readonly MyBuildListItem[]): MyBuildFacets {
  const factions = new Set<string>();
  const tiers = new Set<number>();
  const shipNames = new Set<string>();
  for (const row of rows) {
    shipNames.add(row.shipName);
    const lede = row.ship?.factionLede?.trim();
    if (lede) factions.add(lede);
    if (typeof row.ship?.tier === "number" && Number.isFinite(row.ship.tier)) {
      tiers.add(row.ship.tier);
    }
  }
  return {
    factions: [...factions].sort((a, b) => a.localeCompare(b)),
    tiers: [...tiers].sort((a, b) => a - b),
    shipNames: [...shipNames].sort((a, b) => a.localeCompare(b)),
  };
}

function toListItem(
  loadout: CollectionLoadout,
  shipsById: Map<number, MyBuildShip>,
  captain: LoadoutSeatRatioCaptain | null,
): MyBuildListItem {
  const ship = shipsById.get(loadout.shipId) ?? null;
  const shipName = ship?.name?.trim() || fallbackShipName(loadout.shipId);
  const { filled, total } = loadoutSeatRatio({
    loadout,
    ship,
    captain,
  });
  const peakDps = peakFightDps(loadout.combatParse);
  const fightCount = loadout.combatParse?.fights.length ?? 0;
  return {
    id: loadout.id,
    title: loadout.name,
    shipId: loadout.shipId,
    shipName,
    ship,
    filled,
    total,
    createdAt: loadout.createdAt,
    updatedAt: loadout.updatedAt,
    peakDps,
    fightCount,
    peakDpsLabel:
      fightCount > 0
        ? `${formatCombatDps(peakDps)} DPS (${fightCount} combat${
            fightCount === 1 ? "" : "s"
          })`
        : "",
    to: `/ships/${loadout.shipId}/loadout?loadout=${loadout.id}`,
  };
}

export function listMyBuilds(args: ListMyBuildsArgs): MyBuildsConnection {
  const limit =
    args.limit == null || !Number.isFinite(args.limit)
      ? PUBLIC_BUILDS_PAGE_SIZE
      : Math.max(1, Math.floor(args.limit));
  const offset =
    args.offset == null || !Number.isFinite(args.offset)
      ? 0
      : Math.max(0, Math.floor(args.offset));
  const sort = args.sort ?? "NEWEST";
  const search = args.search?.trim() ?? "";
  const shipName = args.shipName?.trim() ?? "";
  const faction = args.faction?.trim() ?? "";
  const tier =
    args.tier == null || !Number.isFinite(args.tier) ? null : Math.floor(args.tier);

  const shipsById = new Map(args.ships.map((ship) => [ship.id, ship]));
  const rows = args.loadouts.map((loadout) =>
    toListItem(loadout, shipsById, args.captain),
  );
  const facets = collectFacets(rows);

  const filtered = rows.filter((row) => {
    if (shipName && row.shipName !== shipName) return false;
    if (tier != null && row.ship?.tier !== tier) return false;
    if (faction && (!row.ship || !shipMatchesFactionFilter(row.ship, faction))) {
      return false;
    }
    if (
      search &&
      !matchesMyBuildSearch(row.title, row.ship, row.shipName, search)
    ) {
      return false;
    }
    return true;
  });

  const sorted = sortMyBuildItems(filtered, sort);
  return {
    items: sorted.slice(offset, offset + limit),
    totalCount: sorted.length,
    offset,
    limit,
    facets,
  };
}
