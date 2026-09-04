import { describe, expect, it } from "vitest";
import {
  BINDER_PAGE_SIZE,
  clampBinderPage,
  createDefaultShipsListState,
  filterItemsByShip,
  filterShips,
  getBinderPage,
  isFleetShip,
  parseShipsListQuery,
  serializeShipsListQuery,
  shipsListFiltersAreActive,
  shipsListQueryForAcquisition,
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
    cost: "1;PPP5",
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
      costs: [],
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

  it("filters and searches by acquisition currency", () => {
    expect(
      filterShips(ships, {
        ...createDefaultShipsListState(),
        costs: ["PPP5"],
      }).map((ship) => ship.id),
    ).toEqual([5]);

    expect(
      filterShips(ships, {
        ...createDefaultShipsListState(),
        search: "Epic Phoenix Prize Pack Token",
      }).map((ship) => ship.id),
    ).toEqual([5]);
  });

  it("hides Fleet hulls when hideFleet is on", () => {
    const fleet: ShipListItem = {
      id: 6,
      name: "Fleet Advanced Escort",
      type: "Escort",
      tier: 5,
      faction: "United Federation of Planets",
      factionLede: "Federation",
      displayPrefix: "Fleet",
    };
    const roster = [...ships, fleet];

    expect(
      filterShips(roster, createDefaultShipsListState()).map((ship) => ship.id),
    ).toContain(6);
    expect(
      filterShips(roster, {
        ...createDefaultShipsListState(),
        hideFleet: true,
      }).map((ship) => ship.id),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("hides collected ships when hideCollected is on", () => {
    expect(
      filterShips(
        ships,
        { ...createDefaultShipsListState(), hideCollected: true },
        new Set([1, 5]),
      ).map((ship) => ship.id),
    ).toEqual([2, 3, 4]);
  });

  it("applies Fleet and collected hides together", () => {
    const fleet: ShipListItem = {
      id: 6,
      name: "Fleet B'rel Bird-of-Prey",
      type: "Raider",
      tier: 5,
      faction: "Klingon Empire",
      factionLede: "Klingon Empire",
      displayPrefix: "Fleet",
    };

    expect(
      filterShips(
        [...ships, fleet],
        {
          ...createDefaultShipsListState(),
          hideCollected: true,
          hideFleet: true,
        },
        new Set([1]),
      ).map((ship) => ship.id),
    ).toEqual([2, 3, 4, 5]);
  });

  it("filters collection-style rows by the mapped ship catalog item", () => {
    const rows = ships.map((ship) => ({ catalogId: ship.id, label: ship.name }));
    const fleetRow = {
      catalogId: 6,
      label: "Fleet Advanced Escort",
    };
    const roster = [
      ...ships,
      {
        id: 6,
        name: "Fleet Advanced Escort",
        type: "Escort",
        tier: 5,
        faction: "United Federation of Planets",
        factionLede: "Federation",
        displayPrefix: "Fleet",
      },
    ];
    const byId = new Map(roster.map((ship) => [ship.id, ship]));

    expect(
      filterItemsByShip(
        [...rows, fleetRow],
        (row) => byId.get(row.catalogId)!,
        { ...createDefaultShipsListState(), hideFleet: true },
      ).map((row) => row.catalogId),
    ).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("isFleetShip", () => {
  it("matches Fleet prefix or the word Fleet in the name", () => {
    expect(
      isFleetShip({ name: "Advanced Escort", displayPrefix: null }),
    ).toBe(false);
    expect(
      isFleetShip({
        name: "Fleet Advanced Escort",
        displayPrefix: "Fleet",
      }),
    ).toBe(true);
    expect(
      isFleetShip({ name: "Fleet Mogh Battlecruiser (T6)", displayPrefix: "" }),
    ).toBe(true);
    expect(
      isFleetShip({
        name: "B'rel Fleet Bird-of-Prey Retrofit",
        displayPrefix: null,
      }),
    ).toBe(true);
    expect(
      isFleetShip({ name: "Starfleet Medical Science Vessel", displayPrefix: "" }),
    ).toBe(false);
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
      ...createDefaultShipsListState(),
      search: "escort",
      types: ["Escort"],
      factions: ["Federation"],
      tiers: [5, 6],
      costs: ["PPP5"],
      hideCollected: true,
      hideFleet: true,
      page: 2,
    };

    expect(parseShipsListQuery(serializeShipsListQuery(state))).toEqual(state);
  });

  it("builds an acquisition query that lists matching ships", () => {
    const query = shipsListQueryForAcquisition({
      currencyCode: "PPP5",
      label: "Epic Phoenix Prize Pack Token",
    });
    expect(query).toEqual({
      q: "Epic Phoenix Prize Pack Token",
      cost: "PPP5",
    });
    expect(shipsListQueryIsEmpty(query)).toBe(false);
  });

  it("detects empty query objects", () => {
    expect(shipsListQueryIsEmpty({})).toBe(true);
    expect(shipsListQueryIsEmpty({ q: "a" })).toBe(false);
  });

  it("treats hide flags and search as active filters", () => {
    expect(shipsListFiltersAreActive(createDefaultShipsListState())).toBe(false);
    expect(
      shipsListFiltersAreActive({
        ...createDefaultShipsListState(),
        hideFleet: true,
      }),
    ).toBe(true);
  });
});
