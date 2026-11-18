import type { Prisma, PrismaClient } from "@sto-aegis/database";
import { SHARE_VISIBILITY } from "./sharePayload.js";

export const PUBLIC_BUILDS_DEFAULT_LIMIT = 24;
export const PUBLIC_BUILDS_MAX_LIMIT = 48;

export const PUBLIC_BUILD_SORTS = [
  "NEWEST",
  "UPDATED",
  "NAME",
  "FEATURED",
] as const;

export type PublicBuildSort = (typeof PUBLIC_BUILD_SORTS)[number];

export type PublicBuildsArgs = {
  search?: string | null;
  shipName?: string | null;
  faction?: string | null;
  tier?: number | null;
  sort?: string | null;
  offset?: number | null;
  limit?: number | null;
};

export type PublicBuildShip = {
  id: number;
  name: string;
  image: string | null;
  type: string | null;
  tier: number | null;
  faction: string | null;
  factionLede: string | null;
  facSort: string | null;
  displayPrefix: string | null;
  displayClass: string | null;
  displayType: string | null;
  cost: string | null;
  fc: boolean;
  experimental: boolean;
  secondaryDeflector: boolean;
};

export type PublicBuildItem = {
  publicCode: string;
  title: string;
  shipName: string;
  ship: PublicBuildShip | null;
  fillCount: number;
  featuredCount: number;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicBuildFacets = {
  factions: string[];
  tiers: number[];
  shipNames: string[];
};

export type PublicBuildConnection = {
  items: PublicBuildItem[];
  totalCount: number;
  offset: number;
  limit: number;
  facets: PublicBuildFacets;
};

type PublicBuildRow = {
  publicCode: string;
  title: string;
  shipName: string;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { fills: number; featured: number };
};

const SHIP_SELECT = {
  id: true,
  name: true,
  image: true,
  type: true,
  tier: true,
  faction: true,
  factionLede: true,
  facSort: true,
  displayPrefix: true,
  displayClass: true,
  displayType: true,
  cost: true,
  fc: true,
  experimental: true,
  secondaryDeflector: true,
} satisfies Prisma.ShipSelect;

export function clampPublicBuildLimit(limit?: number | null): number {
  if (limit == null || !Number.isFinite(limit)) return PUBLIC_BUILDS_DEFAULT_LIMIT;
  return Math.min(PUBLIC_BUILDS_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

export function clampPublicBuildOffset(offset?: number | null): number {
  if (offset == null || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

export function parsePublicBuildSort(sort?: string | null): PublicBuildSort {
  if (sort && (PUBLIC_BUILD_SORTS as readonly string[]).includes(sort)) {
    return sort as PublicBuildSort;
  }
  return "NEWEST";
}

export function shipMatchesFactionFilter(
  ship: Pick<PublicBuildShip, "faction" | "factionLede">,
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

export function matchesPublicBuildSearch(
  row: Pick<PublicBuildRow, "title" | "shipName">,
  ship: Pick<
    PublicBuildShip,
    "name" | "displayClass" | "displayPrefix" | "displayType"
  > | null,
  search: string,
): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    row.title,
    row.shipName,
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

function listedStamp(row: PublicBuildRow): number {
  return (row.listedAt ?? row.createdAt).getTime();
}

export function sortPublicBuildRows(
  rows: readonly PublicBuildRow[],
  sort: PublicBuildSort,
): PublicBuildRow[] {
  const copy = [...rows];
  copy.sort((left, right) => {
    if (sort === "NAME") {
      const byTitle = left.title.localeCompare(right.title);
      if (byTitle !== 0) return byTitle;
      const byShip = left.shipName.localeCompare(right.shipName);
      if (byShip !== 0) return byShip;
      return left.publicCode.localeCompare(right.publicCode);
    }
    if (sort === "UPDATED") {
      const byUpdated = right.updatedAt.getTime() - left.updatedAt.getTime();
      if (byUpdated !== 0) return byUpdated;
      return left.publicCode.localeCompare(right.publicCode);
    }
    if (sort === "FEATURED") {
      const byFeatured = right._count.featured - left._count.featured;
      if (byFeatured !== 0) return byFeatured;
      const byListed = listedStamp(right) - listedStamp(left);
      if (byListed !== 0) return byListed;
      return left.publicCode.localeCompare(right.publicCode);
    }
    const byListed = listedStamp(right) - listedStamp(left);
    if (byListed !== 0) return byListed;
    return left.publicCode.localeCompare(right.publicCode);
  });
  return copy;
}

function collectFacets(
  rows: readonly PublicBuildRow[],
  shipsByName: Map<string, PublicBuildShip>,
): PublicBuildFacets {
  const factions = new Set<string>();
  const tiers = new Set<number>();
  const shipNames = new Set<string>();
  for (const row of rows) {
    shipNames.add(row.shipName);
    const ship = shipsByName.get(row.shipName);
    const lede = ship?.factionLede?.trim();
    if (lede) factions.add(lede);
    if (typeof ship?.tier === "number" && Number.isFinite(ship.tier)) {
      tiers.add(ship.tier);
    }
  }
  return {
    factions: [...factions].sort((a, b) => a.localeCompare(b)),
    tiers: [...tiers].sort((a, b) => a - b),
    shipNames: [...shipNames].sort((a, b) => a.localeCompare(b)),
  };
}

export async function listPublicBuilds(
  prisma: PrismaClient,
  args: PublicBuildsArgs = {},
): Promise<PublicBuildConnection> {
  const limit = clampPublicBuildLimit(args.limit);
  const offset = clampPublicBuildOffset(args.offset);
  const sort = parsePublicBuildSort(args.sort);
  const search = args.search?.trim() ?? "";
  const shipName = args.shipName?.trim() ?? "";
  const faction = args.faction?.trim() ?? "";
  const tier =
    args.tier == null || !Number.isFinite(args.tier) ? null : Math.floor(args.tier);

  const rows = (await prisma.build.findMany({
    where: { visibility: SHARE_VISIBILITY.public },
    select: {
      publicCode: true,
      title: true,
      shipName: true,
      listedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { fills: true, featured: true } },
    },
  })) as PublicBuildRow[];

  const uniqueNames = [...new Set(rows.map((row) => row.shipName))];
  const ships = uniqueNames.length
    ? ((await prisma.ship.findMany({
        where: { name: { in: uniqueNames } },
        select: SHIP_SELECT,
      })) as PublicBuildShip[])
    : [];
  const shipsByName = new Map(ships.map((ship) => [ship.name, ship]));
  const facets = collectFacets(rows, shipsByName);

  const filtered = rows.filter((row) => {
    const ship = shipsByName.get(row.shipName) ?? null;
    if (shipName && row.shipName !== shipName) return false;
    if (tier != null && ship?.tier !== tier) return false;
    if (faction && (!ship || !shipMatchesFactionFilter(ship, faction))) {
      return false;
    }
    if (search && !matchesPublicBuildSearch(row, ship, search)) return false;
    return true;
  });

  const sorted = sortPublicBuildRows(filtered, sort);
  const items = sorted.slice(offset, offset + limit).map((row) => ({
    publicCode: row.publicCode,
    title: row.title,
    shipName: row.shipName,
    ship: shipsByName.get(row.shipName) ?? null,
    fillCount: row._count.fills,
    featuredCount: row._count.featured,
    listedAt: row.listedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return {
    items,
    totalCount: sorted.length,
    offset,
    limit,
    facets,
  };
}
