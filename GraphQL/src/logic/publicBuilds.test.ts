import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampPublicBuildLimit,
  clampPublicBuildOffset,
  listPublicBuilds,
  matchesPublicBuildSearch,
  parsePublicBuildSort,
  shipMatchesFactionFilter,
  sortPublicBuildRows,
  PUBLIC_BUILDS_DEFAULT_LIMIT,
  PUBLIC_BUILDS_MAX_LIMIT,
} from "./publicBuilds.js";

function stamp(iso: string): Date {
  return new Date(iso);
}

function row(overrides: {
  publicCode: string;
  title: string;
  shipName: string;
  listedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  fills?: number;
  featured?: number;
}) {
  return {
    publicCode: overrides.publicCode,
    title: overrides.title,
    shipName: overrides.shipName,
    listedAt: overrides.listedAt ?? stamp("2026-11-01T00:00:00.000Z"),
    createdAt: overrides.createdAt ?? stamp("2026-10-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? stamp("2026-11-01T00:00:00.000Z"),
    _count: {
      fills: overrides.fills ?? 12,
      featured: overrides.featured ?? 0,
    },
  };
}

describe("publicBuilds clamps and sort", () => {
  it("clamps limit to 1..48 and defaults to 24", () => {
    assert.equal(clampPublicBuildLimit(null), PUBLIC_BUILDS_DEFAULT_LIMIT);
    assert.equal(clampPublicBuildLimit(0), 1);
    assert.equal(clampPublicBuildLimit(3.9), 3);
    assert.equal(clampPublicBuildLimit(99), PUBLIC_BUILDS_MAX_LIMIT);
    assert.equal(clampPublicBuildOffset(-8), 0);
    assert.equal(clampPublicBuildOffset(10.7), 10);
  });

  it("falls back to NEWEST for an unknown sort", () => {
    assert.equal(parsePublicBuildSort("FEATURED"), "FEATURED");
    assert.equal(parsePublicBuildSort("nope"), "NEWEST");
    assert.equal(parsePublicBuildSort(null), "NEWEST");
  });

  it("sorts NEWEST by listedAt, FEATURED by feature count", () => {
    const rows = [
      row({
        publicCode: "a",
        title: "Older",
        shipName: "A",
        listedAt: stamp("2026-01-01T00:00:00.000Z"),
        featured: 5,
      }),
      row({
        publicCode: "b",
        title: "Newer",
        shipName: "B",
        listedAt: stamp("2026-11-01T00:00:00.000Z"),
        featured: 1,
      }),
    ];
    assert.deepEqual(
      sortPublicBuildRows(rows, "NEWEST").map((item) => item.publicCode),
      ["b", "a"],
    );
    assert.deepEqual(
      sortPublicBuildRows(rows, "FEATURED").map((item) => item.publicCode),
      ["a", "b"],
    );
    assert.deepEqual(
      sortPublicBuildRows(rows, "NAME").map((item) => item.title),
      ["Newer", "Older"],
    );
  });
});

describe("publicBuilds matching", () => {
  it("matches search against title, stored ship name, and class", () => {
    const build = {
      title: "Energy 1",
      shipName: "Advanced Heavy Cruiser (T6)",
    };
    const ship = {
      name: "Resolute Advanced Heavy Cruiser (T6)",
      displayClass: "Resolute",
      displayPrefix: null,
      displayType: "Advanced Heavy Cruiser",
    };
    assert.equal(matchesPublicBuildSearch(build, ship, "energy"), true);
    assert.equal(matchesPublicBuildSearch(build, ship, "Resolute"), true);
    assert.equal(matchesPublicBuildSearch(build, ship, "intrepid"), false);
  });

  it("matches faction lede and comma-separated affiliations", () => {
    const ship = {
      faction: "United Federation of Planets,Romulan Republic,Dominion",
      factionLede: "Federation",
    };
    assert.equal(shipMatchesFactionFilter(ship, "Federation"), true);
    assert.equal(shipMatchesFactionFilter(ship, "Romulan Republic"), true);
    assert.equal(shipMatchesFactionFilter(ship, "Klingon Empire"), false);
  });
});

describe("listPublicBuilds", () => {
  const publicRow = row({
    publicCode: "pub1",
    title: "Yeager Energy",
    shipName: "Yeager Miracle Worker Escort",
    listedAt: stamp("2026-11-17T12:00:00.000Z"),
    featured: 2,
  });
  const olderPublic = row({
    publicCode: "pub0",
    title: "Alpha Strike",
    shipName: "Tactical Escort",
    listedAt: stamp("2026-01-02T00:00:00.000Z"),
    featured: 0,
  });
  const unlisted = {
    ...row({
      publicCode: "hid",
      title: "Secret Yeager",
      shipName: "Yeager Miracle Worker Escort",
    }),
    visibility: "unlisted",
  };

  const ships = [
    {
      id: 3196,
      name: "Yeager Miracle Worker Escort",
      image: "File:Fed Ship Yeager.png",
      type: "Escort",
      tier: 6,
      faction: "United Federation of Planets,Romulan Republic,Dominion",
      factionLede: "Federation",
      facSort: "acd",
      displayPrefix: null,
      displayClass: "Yeager",
      displayType: "Miracle Worker Escort",
      cost: "3000;Zen",
      fc: false,
      experimental: true,
      secondaryDeflector: false,
    },
    {
      id: 10,
      name: "Tactical Escort",
      image: null,
      type: "Escort",
      tier: 5,
      faction: "United Federation of Planets",
      factionLede: "Federation",
      facSort: "a",
      displayPrefix: null,
      displayClass: "Defiant",
      displayType: "Tactical Escort",
      cost: null,
      fc: false,
      experimental: false,
      secondaryDeflector: false,
    },
  ];

  function fakePrisma(builds: Array<typeof publicRow & { visibility?: string }>) {
    return {
      build: {
        async findMany(args: { where?: { visibility?: string } }) {
          assert.equal(args.where?.visibility, "public");
          return builds
            .filter((item) => item.visibility !== "unlisted")
            .map(({ visibility: _visibility, ...rest }) => rest);
        },
      },
      ship: {
        async findMany(args: { where?: { name?: { in?: string[] } } }) {
          const names = new Set(args.where?.name?.in ?? []);
          return ships.filter((ship) => names.has(ship.name));
        },
      },
    };
  }

  it("returns only public builds and never lists an unlisted title", async () => {
    const result = await listPublicBuilds(
      fakePrisma([publicRow, olderPublic, unlisted]) as never,
    );
    assert.equal(result.totalCount, 2);
    assert.deepEqual(
      result.items.map((item) => item.publicCode),
      ["pub1", "pub0"],
    );
    assert.equal(
      result.items.some((item) => item.title.includes("Secret")),
      false,
    );
    for (const item of result.items) {
      assert.equal("editTokenHash" in item, false);
      assert.equal("listIpHash" in item, false);
      assert.equal("payload" in item, false);
      assert.equal("id" in item, false);
    }
  });

  it("filters by search, ship, tier, and faction, then paginates", async () => {
    const prisma = fakePrisma([publicRow, olderPublic, unlisted]) as never;
    const byName = await listPublicBuilds(prisma, { search: "yeager" });
    assert.equal(byName.totalCount, 1);
    assert.equal(byName.items[0]?.publicCode, "pub1");
    assert.equal(byName.items[0]?.ship?.displayClass, "Yeager");

    const byShip = await listPublicBuilds(prisma, {
      shipName: "Tactical Escort",
    });
    assert.equal(byShip.totalCount, 1);
    assert.equal(byShip.items[0]?.publicCode, "pub0");

    const byTier = await listPublicBuilds(prisma, { tier: 6 });
    assert.equal(byTier.totalCount, 1);
    assert.equal(byTier.items[0]?.publicCode, "pub1");

    const page = await listPublicBuilds(prisma, {
      sort: "NAME",
      limit: 1,
      offset: 1,
    });
    assert.equal(page.totalCount, 2);
    assert.equal(page.limit, 1);
    assert.equal(page.offset, 1);
    assert.equal(page.items[0]?.title, "Yeager Energy");
    assert.deepEqual(page.facets.tiers, [5, 6]);
    assert.ok(page.facets.factions.includes("Federation"));
  });
});
