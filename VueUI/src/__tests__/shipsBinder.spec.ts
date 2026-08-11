import { describe, expect, it } from "vitest";
import {
  BINDER_PAGE_SIZE,
  clampBinderPage,
  createDefaultShipsListState,
  filterShips,
  getBinderPage,
  parseShipsListQuery,
  serializeShipsListQuery,
  shipsListQueryIsEmpty,
  toggleInclusiveValue,
  uniqueSortedStrings,
  uniqueSortedTiers,
  type ShipListItem,
} from "@/logic/shipsBinder";

const ships: ShipListItem[] = [
  {
    id: 1,
    name: "Advanced Escort",
    type: "Escort",
    tier: 5,
    faction: "United Federation of Planets",
    factionLede: "Federation",
    displayClass: "Prometheus",
  },
  {
    id: 2,
    name: "B'rel Bird-of-Prey",
    type: "Raider",
    tier: 5,
    faction: "Klingon Empire",
    factionLede: "Klingon Empire",
  },
  {
    id: 3,
    name: "T'varo Light Warbird",
    type: "Warbird",
    tier: 1,
    faction: "Romulan Republic",
    factionLede: "Romulan Republic",
  },
  {
    id: 4,
    name: "Jem'Hadar Attack Ship",
    type: "Escort",
    tier: 5,
    faction: "Dominion",
    factionLede: "Dominion",
  },
  {
    id: 5,
    name: "Obelisk Carrier",
    type: "Carrier",
    tier: 5,
    faction: "United Federation of Planets,Klingon Empire",
    factionLede: "Cross-Faction",
  },
];

describe("toggleInclusiveValue", () => {
  it("adds and removes values", () => {
    expect(toggleInclusiveValue(["Escort"], "Cruiser")).toEqual([
      "Escort",
      "Cruiser",
    ]);
    expect(toggleInclusiveValue(["Escort", "Cruiser"], "Escort")).toEqual([
      "Cruiser",
    ]);
  });
});

describe("uniqueSorted helpers", () => {
  it("dedupes and sorts strings and tiers", () => {
    expect(uniqueSortedStrings(["Cruiser", null, "Escort", "Cruiser", "  "])).toEqual([
      "Cruiser",
      "Escort",
    ]);
    expect(uniqueSortedTiers([6, null, 1, 6, Number.NaN])).toEqual([1, 6]);
  });
});

describe("filterShips", () => {
  it("filters type/tier and promotes selected factions without excluding others", () => {
    const filtered = filterShips(ships, {
      search: "",
      types: ["Escort", "Raider", "Carrier"],
      factions: ["Federation"],
      tiers: [5],
    });

    // Escort/Raider/Carrier + tier 5 remain; Federation-affiliated ships lead.
    expect(filtered.map((ship) => ship.id)).toEqual([1, 5, 2, 4]);
  });

  it("matches search against name and related fields", () => {
    expect(
      filterShips(ships, {
        ...createDefaultShipsListState(),
        search: "prometheus",
      }).map((ship) => ship.id),
    ).toEqual([1]);

    expect(
      filterShips(ships, {
        ...createDefaultShipsListState(),
        search: "t5",
      }).map((ship) => ship.id),
    ).toEqual([1, 2, 4, 5]);
  });

  it("promotes cross-faction ships when that faction filter is selected", () => {
    expect(
      filterShips(ships, {
        ...createDefaultShipsListState(),
        factions: ["Cross-Faction"],
      }).map((ship) => ship.id),
    ).toEqual([5, 1, 2, 3, 4]);
  });

  it("promotes ships sharing a selected faction in their faction list", () => {
    expect(
      filterShips(ships, {
        ...createDefaultShipsListState(),
        factions: ["Klingon Empire"],
      }).map((ship) => ship.id),
    ).toEqual([2, 5, 1, 3, 4]);
  });
});

describe("getBinderPage", () => {
  it("splits eighteen items into two sides of nine", () => {
    const items = Array.from({ length: BINDER_PAGE_SIZE + 3 }, (_, i) => i + 1);
    const page = getBinderPage(items, 1);

    expect(page.left).toHaveLength(9);
    expect(page.right).toHaveLength(9);
    expect(page.totalPages).toBe(2);
    expect(page.left[0]).toBe(1);
    expect(page.right[0]).toBe(10);
  });

  it("clamps page into range", () => {
    expect(clampBinderPage(0, 10)).toBe(1);
    expect(clampBinderPage(99, 10)).toBe(1);
    expect(clampBinderPage(2, BINDER_PAGE_SIZE + 1)).toBe(2);
  });
});

describe("ships list query serialization", () => {
  it("round-trips query state", () => {
    const state = {
      search: "escort",
      types: ["Escort"],
      factions: ["Federation"],
      tiers: [5, 6],
      page: 2,
    };

    expect(parseShipsListQuery(serializeShipsListQuery(state))).toEqual(state);
  });

  it("detects empty query objects", () => {
    expect(shipsListQueryIsEmpty({})).toBe(true);
    expect(shipsListQueryIsEmpty({ q: "a" })).toBe(false);
  });
});
