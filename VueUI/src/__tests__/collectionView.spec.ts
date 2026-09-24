import { describe, expect, it } from "vitest";
import {
  collectionFactionTabId,
  groupCollectionByFaction,
  resolveCollectionFactionTab,
} from "@/logic/collection/factionTabs";
import {
  COLLECTION_LIST_SORT_KEY,
  createDefaultCollectionListSortPrefs,
  readStoredCollectionListSort,
  sortRowsByName,
  toggleCollectionListSortDirection,
  writeStoredCollectionListSort,
} from "@/logic/collection/listSort";
import {
  formatHullConsoleSummary,
  hullConsoleCounts,
  hullConsoleSummaryParts,
} from "@/logic/loadout/consoleSummary";
import { formatHullBoffSummary } from "@/utils/formatters";

describe("groupCollectionByFaction", () => {
  const ships = [
    {
      id: 1,
      name: "Jem'Hadar Vanguard Carrier",
      faction: "Dominion",
      factionLede: "Dominion",
      facSort: "d",
    },
    {
      id: 2,
      name: "Galaxy Exploration Cruiser",
      faction: "United Federation of Planets",
      factionLede: "Federation",
      facSort: "a",
    },
    {
      id: 3,
      name: "Bortasqu' Battle Cruiser",
      faction: "Klingon Empire",
      factionLede: "Klingon Empire",
      facSort: "b",
    },
    {
      id: 4,
      name: "T'liss Temporal Warbird",
      faction: "Romulan Republic",
      factionLede: "Romulan Republic",
      facSort: "c",
    },
    {
      id: 5,
      name: "Crossfield Science Spearhead",
      faction: "United Federation of Planets,Klingon Empire",
      factionLede: "Cross-Faction",
      facSort: "ab",
    },
    {
      id: 6,
      name: "Mystery Hull",
      faction: null,
      factionLede: null,
      facSort: null,
    },
  ];

  it("groups by primary faction in Fac Sort order", () => {
    const tabs = groupCollectionByFaction(ships, (ship) => ship);
    expect(tabs.map((tab) => tab.id)).toEqual([
      "federation",
      "klingon",
      "romulan",
      "dominion",
      "cross",
    ]);
    expect(tabs.map((tab) => tab.label)).toEqual([
      "Federation",
      "Klingon",
      "Romulan",
      "Dominion",
      "Cross-Faction",
    ]);
    expect(tabs[0]!.rows.map((row) => row.id)).toEqual([2]);
    expect(tabs[4]!.rows.map((row) => row.id)).toEqual([5]);
  });

  it("omits empty faction tabs and unknown ships", () => {
    const tabs = groupCollectionByFaction(
      ships.filter((ship) => ship.id === 2 || ship.id === 6),
      (ship) => ship,
    );
    expect(tabs.map((tab) => tab.id)).toEqual(["federation"]);
  });

  it("resolves tab id from factionLede before facSort", () => {
    expect(
      collectionFactionTabId({
        faction: "United Federation of Planets,Dominion",
        factionLede: "Cross-Faction",
        facSort: "ad",
      }),
    ).toBe("cross");
    expect(
      collectionFactionTabId({
        faction: "Dominion,United Federation of Planets",
        factionLede: null,
        facSort: "da",
      }),
    ).toBe("dominion");
  });

  it("keeps a requested faction tab when still available", () => {
    expect(resolveCollectionFactionTab("klingon", ["federation", "klingon"])).toBe(
      "klingon",
    );
    expect(resolveCollectionFactionTab("romulan", ["federation", "klingon"])).toBe(
      "federation",
    );
    expect(resolveCollectionFactionTab(null, [])).toBeNull();
  });
});

describe("sortRowsByName", () => {
  const rows = [
    { name: "Zhat Vash Warbird" },
    { name: "Akira Raptor Escort" },
    { name: "akira heavy escort" },
  ];

  it("sorts A→Z by default with case-insensitive compare", () => {
    expect(sortRowsByName(rows, (row) => row.name).map((row) => row.name)).toEqual([
      "akira heavy escort",
      "Akira Raptor Escort",
      "Zhat Vash Warbird",
    ]);
  });

  it("reverses to Z→A when requested", () => {
    expect(
      sortRowsByName(rows, (row) => row.name, "desc").map((row) => row.name),
    ).toEqual(["Zhat Vash Warbird", "Akira Raptor Escort", "akira heavy escort"]);
  });

  it("toggles and persists sort direction in localStorage", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };

    expect(readStoredCollectionListSort(storage)).toEqual(
      createDefaultCollectionListSortPrefs(),
    );
    writeStoredCollectionListSort({ direction: "desc" }, storage);
    expect(memory.get(COLLECTION_LIST_SORT_KEY)).toContain("desc");
    expect(readStoredCollectionListSort(storage).direction).toBe("desc");
    expect(toggleCollectionListSortDirection("desc")).toBe("asc");
  });
});

describe("hullConsoleCounts", () => {
  it("adds T6 extras and Commander Miracle Worker UNI seats", () => {
    const counts = hullConsoleCounts({
      tier: 6,
      engineeringSlots: 2,
      scienceSlots: 3,
      tacticalSlots: 4,
      boffs: "Commander Universal-Miracle Worker,Lieutenant Tactical",
    });
    expect(counts).toEqual({
      engineering: 2,
      science: 3,
      tactical: 4,
      universal: 3,
    });
    expect(formatHullConsoleSummary({
      tier: 6,
      engineeringSlots: 2,
      scienceSlots: 3,
      tacticalSlots: 4,
      boffs: "Commander Universal-Miracle Worker,Lieutenant Tactical",
    })).toBe("2 x ENG | 3 x SCI | 4 x TAC | 3 x UNI");
  });

  it("omits zero careers from the summary parts", () => {
    expect(
      hullConsoleSummaryParts({
        tier: 5,
        engineeringSlots: 0,
        scienceSlots: 2,
        tacticalSlots: 0,
        t5uConsole: null,
      }).map((part) => part.label),
    ).toEqual(["SCI"]);
  });

  it("includes T5-U career console extras", () => {
    expect(
      hullConsoleCounts({
        tier: 5,
        engineeringSlots: 1,
        scienceSlots: 1,
        tacticalSlots: 1,
        t5uConsole: "tac",
      }),
    ).toEqual({
      engineering: 1,
      science: 1,
      tactical: 2,
      universal: 2,
    });
  });
});

describe("formatHullBoffSummary", () => {
  it("formats seats as Ship Details rank + career[/spec] tokens", () => {
    expect(
      formatHullBoffSummary([
        { rank: "Commander", career: "Tactical", specialization: "Miracle Worker" },
        {
          rank: "Lieutenant Commander",
          career: "Engineering",
          specialization: null,
        },
        {
          rank: "Lieutenant Commander",
          career: "Universal",
          specialization: "Command",
        },
        { rank: "Lieutenant", career: "Tactical" },
        { rank: "Ensign", career: "Science" },
      ]),
    ).toBe("CMDR TAC/MW | LTCMDR ENG | LTCMDR UNI/CMD | LT TAC | ENS SCI");
  });
});
