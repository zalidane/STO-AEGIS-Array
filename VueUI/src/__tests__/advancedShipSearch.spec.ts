import { describe, expect, it } from "vitest";
import {
  buildAcquisitionSelectItems,
  classifyAcquisitionPrimary,
  createDefaultAdvancedShipSearchFilters,
  deriveAdvancedShipSearchRow,
  extractFullSpecs,
  filterAdvancedShipSearchRows,
  indexAdvancedShipSearchRows,
  loadAdvancedShipSearchFilterPrefs,
  matchesAdvancedShipSearchFilters,
  normalizeFullSpec,
  shipHasFleetVersion,
  buildFleetAvailabilityIndex,
  saveAdvancedShipSearchFilterPrefs,
  sortAdvancedShipSearchRows,
  totalWeaponCount,
  ADVANCED_SHIP_SEARCH_FILTER_PREFS_KEY,
  type AdvancedShipSearchSource,
} from "@/logic/advancedShipSearch";

function ship(
  overrides: Partial<AdvancedShipSearchSource> &
    Pick<AdvancedShipSearchSource, "id" | "name">,
): AdvancedShipSearchSource {
  return {
    foreWeapons: 4,
    aftWeapons: 3,
    experimental: false,
    equipCannons: false,
    secondaryDeflector: false,
    hangars: 0,
    tacticalSlots: 3,
    engineeringSlots: 3,
    scienceSlots: 3,
    t5uConsole: null,
    boffs: "Commander Tactical,Lieutenant Engineering,Lieutenant Science",
    cost: "3000;Zen",
    faction: "United Federation of Planets",
    factionLede: "Federation",
    displayClass: "Test",
    displayPrefix: null,
    tier: 6,
    ...overrides,
  };
}

describe("normalizeFullSpec / extractFullSpecs", () => {
  it("maps wiki specialization aliases", () => {
    expect(normalizeFullSpec("Intelligence")).toBe("Intel");
    expect(normalizeFullSpec("Temporal Operative")).toBe("Temporal");
    expect(normalizeFullSpec("Miracle Worker")).toBe("Miracle Worker");
    expect(normalizeFullSpec("Command")).toBe("Command");
    expect(normalizeFullSpec("Pilot")).toBe("Pilot");
    expect(normalizeFullSpec(null)).toBeNull();
  });

  it("extracts unique specs in canonical order", () => {
    expect(
      extractFullSpecs(
        "Commander Tactical-Miracle Worker,Lieutenant Commander Universal-Command,Ensign Science-Intelligence",
      ),
    ).toEqual(["Command", "Intel", "Miracle Worker"]);
  });

  it("returns empty when there is no specialization seating", () => {
    expect(
      extractFullSpecs("Commander Tactical,Lieutenant Engineering"),
    ).toEqual([]);
  });
});

describe("fleet availability", () => {
  const roster = [
    ship({
      id: 1,
      name: "Mogh Battlecruiser",
      displayClass: "Mogh",
      tier: 5,
    }),
    ship({
      id: 2,
      name: "Fleet Mogh Battlecruiser (T5)",
      displayClass: "Mogh",
      displayPrefix: "Fleet",
      tier: 5,
    }),
    ship({
      id: 3,
      name: "Fleet Mogh Battlecruiser (T6)",
      displayClass: "Mogh",
      displayPrefix: "Fleet",
      tier: 6,
    }),
    ship({
      id: 4,
      name: "Kurak Battlecruiser",
      displayClass: "Kurak",
      tier: 6,
    }),
    ship({
      id: 5,
      name: "Achilles Miracle Worker Heavy Destroyer",
      displayClass: "Achilles",
      tier: 6,
    }),
  ];

  it("marks class+tier pairs that have a Fleet sibling", () => {
    const keys = buildFleetAvailabilityIndex(roster);
    expect(shipHasFleetVersion(roster[0]!, keys)).toBe(true);
    expect(shipHasFleetVersion(roster[1]!, keys)).toBe(true);
    expect(shipHasFleetVersion(roster[2]!, keys)).toBe(true);
    // Kurak T6 is not linked to Fleet Mogh T6 in Cargo displayClass.
    expect(shipHasFleetVersion(roster[3]!, keys)).toBe(false);
    expect(shipHasFleetVersion(roster[4]!, keys)).toBe(false);
  });
});

describe("matchesAdvancedShipSearchFilters", () => {
  const rows = indexAdvancedShipSearchRows([
    ship({
      id: 1,
      name: "Achilles Miracle Worker Heavy Destroyer",
      displayClass: "Achilles",
      foreWeapons: 5,
      aftWeapons: 2,
      experimental: true,
      equipCannons: true,
      secondaryDeflector: false,
      hangars: null,
      tacticalSlots: 5,
      engineeringSlots: 2,
      scienceSlots: 4,
      boffs:
        "Commander Tactical-Miracle Worker,Lieutenant Commander Universal-Miracle Worker",
      cost: "3000;Zen",
      factionLede: "Federation",
      tier: 6,
    }),
    ship({
      id: 2,
      name: "Fleet Advanced Escort",
      displayClass: "Advanced Escort",
      displayPrefix: "Fleet",
      foreWeapons: 4,
      aftWeapons: 3,
      experimental: false,
      equipCannons: true,
      hangars: 0,
      tacticalSlots: 4,
      engineeringSlots: 3,
      scienceSlots: 2,
      boffs: "Commander Tactical,Lieutenant Commander Tactical-Pilot",
      cost: "20000;FC / 5;FSM",
      factionLede: "Federation",
      tier: 5,
    }),
    ship({
      id: 3,
      name: "Advanced Escort",
      displayClass: "Advanced Escort",
      foreWeapons: 4,
      aftWeapons: 3,
      experimental: false,
      equipCannons: true,
      hangars: 0,
      tacticalSlots: 4,
      engineeringSlots: 2,
      scienceSlots: 3,
      boffs: "Commander Tactical,Lieutenant Engineering",
      cost: "1;LB",
      factionLede: "Federation",
      tier: 5,
      t5uConsole: "tac",
    }),
    ship({
      id: 4,
      name: "Caitian Atrox Carrier (T6)",
      displayClass: "Atrox",
      foreWeapons: 3,
      aftWeapons: 3,
      hangars: 2,
      secondaryDeflector: true,
      equipCannons: false,
      experimental: false,
      tacticalSlots: 2,
      engineeringSlots: 4,
      scienceSlots: 5,
      boffs: "Commander Science-Command,Lieutenant Commander Science",
      cost: "3000;Zen",
      factionLede: "Federation",
      tier: 6,
    }),
    ship({
      id: 5,
      name: "B'rel Bird-of-Prey",
      displayClass: "B'rel",
      foreWeapons: 3,
      aftWeapons: 1,
      hangars: 0,
      factionLede: "Klingon Empire",
      faction: "Klingon Empire",
      cost: "20;SRKDF5",
      boffs: "Commander Tactical,Ensign Universal",
      tier: 5,
    }),
  ]);

  it("returns all ships when filters are empty", () => {
    const filters = createDefaultAdvancedShipSearchFilters();
    expect(filterAdvancedShipSearchRows(rows, filters)).toHaveLength(rows.length);
  });

  it("ORs within fore/aft weapon multi-select and ANDs across dimensions", () => {
    const filters = createDefaultAdvancedShipSearchFilters();
    filters.foreWeapons = [4, 5];
    filters.aftWeapons = [2];
    const hits = filterAdvancedShipSearchRows(rows, filters);
    expect(hits.map((row) => row.name)).toEqual([
      "Achilles Miracle Worker Heavy Destroyer",
    ]);
  });

  it("filters experimental yes/no", () => {
    const yes = createDefaultAdvancedShipSearchFilters();
    yes.experimental = ["yes"];
    expect(
      filterAdvancedShipSearchRows(rows, yes).map((row) => row.name),
    ).toEqual(["Achilles Miracle Worker Heavy Destroyer"]);

    const no = createDefaultAdvancedShipSearchFilters();
    no.experimental = ["no"];
    expect(filterAdvancedShipSearchRows(rows, no)).toHaveLength(rows.length - 1);
  });

  it("filters total weapons (fore + aft + experimental as 1)", () => {
    // Achilles: 5 + 2 + 1 = 8
    const eight = createDefaultAdvancedShipSearchFilters();
    eight.totalWeapons = [8];
    expect(
      filterAdvancedShipSearchRows(rows, eight).map((row) => row.name),
    ).toEqual(["Achilles Miracle Worker Heavy Destroyer"]);

    // Advanced Escort T5 (no exp): 4 + 3 + 0 = 7; Fleet Advanced Escort same
    const seven = createDefaultAdvancedShipSearchFilters();
    seven.totalWeapons = [7];
    expect(
      filterAdvancedShipSearchRows(rows, seven)
        .map((row) => row.name)
        .sort(),
    ).toEqual(["Advanced Escort", "Fleet Advanced Escort"].sort());

    // Multi-select OR: 7 or 8
    const either = createDefaultAdvancedShipSearchFilters();
    either.totalWeapons = [7, 8];
    expect(filterAdvancedShipSearchRows(rows, either)).toHaveLength(3);
  });

  it("ORs full-spec seats and supports None", () => {
    const mw = createDefaultAdvancedShipSearchFilters();
    mw.fullSpecs = ["Miracle Worker"];
    expect(
      filterAdvancedShipSearchRows(rows, mw).map((row) => row.name),
    ).toEqual(["Achilles Miracle Worker Heavy Destroyer"]);

    const pilotOrCommand = createDefaultAdvancedShipSearchFilters();
    pilotOrCommand.fullSpecs = ["Pilot", "Command"];
    expect(
      filterAdvancedShipSearchRows(rows, pilotOrCommand).map((row) => row.name),
    ).toEqual([
      "Fleet Advanced Escort",
      "Caitian Atrox Carrier (T6)",
    ]);

    const none = createDefaultAdvancedShipSearchFilters();
    none.fullSpecs = ["None"];
    expect(
      filterAdvancedShipSearchRows(rows, none).map((row) => row.name).sort(),
    ).toEqual(["Advanced Escort", "B'rel Bird-of-Prey"].sort());
  });

  it("filters secondary deflector and hangars (null hangars as 0)", () => {
    const sec = createDefaultAdvancedShipSearchFilters();
    sec.secondaryDeflector = ["yes"];
    expect(
      filterAdvancedShipSearchRows(rows, sec).map((row) => row.name),
    ).toEqual(["Caitian Atrox Carrier (T6)"]);

    const hangars = createDefaultAdvancedShipSearchFilters();
    hangars.hangars = [0, 2];
    expect(filterAdvancedShipSearchRows(rows, hangars)).toHaveLength(5);

    const two = createDefaultAdvancedShipSearchFilters();
    two.hangars = [2];
    expect(
      filterAdvancedShipSearchRows(rows, two).map((row) => row.name),
    ).toEqual(["Caitian Atrox Carrier (T6)"]);

    const achilles = rows.find((row) => row.name.startsWith("Achilles"))!;
    expect(achilles.hangars).toBe(0);
  });

  it("filters console layouts with OR within a career and AND across careers", () => {
    // Achilles T6: wiki 5/2/4 + 2 UNI (T6-X/X2) + 1 UNI (Cmdr MW) = TAC 5 ENG 2 SCI 4 UNI 3
    const filters = createDefaultAdvancedShipSearchFilters();
    filters.tacConsoles = [5];
    filters.engConsoles = [2];
    filters.uniConsoles = [3];
    expect(
      filterAdvancedShipSearchRows(rows, filters).map((row) => row.name),
    ).toEqual(["Achilles Miracle Worker Heavy Destroyer"]);

    filters.tacConsoles = [4, 5];
    const multi = filterAdvancedShipSearchRows(rows, filters);
    expect(multi.map((row) => row.name)).toContain(
      "Achilles Miracle Worker Heavy Destroyer",
    );
  });

  it("filters dual cannons", () => {
    const no = createDefaultAdvancedShipSearchFilters();
    no.dualCannons = ["no"];
    expect(
      filterAdvancedShipSearchRows(rows, no).map((row) => row.name),
    ).toEqual(["Caitian Atrox Carrier (T6)", "B'rel Bird-of-Prey"]);
  });

  it("ORs acquisition currency codes", () => {
    const filters = createDefaultAdvancedShipSearchFilters();
    filters.acquisition = ["Zen", "LB"];
    expect(
      filterAdvancedShipSearchRows(rows, filters)
        .map((row) => row.name)
        .sort(),
    ).toEqual(
      [
        "Achilles Miracle Worker Heavy Destroyer",
        "Advanced Escort",
        "Caitian Atrox Carrier (T6)",
      ].sort(),
    );
  });

  it("filters faction as an exclude filter", () => {
    const filters = createDefaultAdvancedShipSearchFilters();
    filters.factions = ["Klingon Empire"];
    expect(
      filterAdvancedShipSearchRows(rows, filters).map((row) => row.name),
    ).toEqual(["B'rel Bird-of-Prey"]);
  });

  it("filters fleet-available yes/no using class+tier pairing", () => {
    const yes = createDefaultAdvancedShipSearchFilters();
    yes.fleetAvailable = ["yes"];
    expect(
      filterAdvancedShipSearchRows(rows, yes).map((row) => row.name).sort(),
    ).toEqual(
      ["Fleet Advanced Escort", "Advanced Escort"].sort(),
    );

    const no = createDefaultAdvancedShipSearchFilters();
    no.fleetAvailable = ["no"];
    const noHits = filterAdvancedShipSearchRows(rows, no).map((row) => row.name);
    expect(noHits).toContain("Achilles Miracle Worker Heavy Destroyer");
    expect(noHits).not.toContain("Advanced Escort");
    expect(noHits).not.toContain("Fleet Advanced Escort");
  });

  it("ANDs name search with structured filters", () => {
    const filters = createDefaultAdvancedShipSearchFilters();
    filters.search = "escort";
    filters.dualCannons = ["yes"];
    expect(
      filterAdvancedShipSearchRows(rows, filters).map((row) => row.name).sort(),
    ).toEqual(["Advanced Escort", "Fleet Advanced Escort"].sort());
  });

  it("matches a single row helper consistently", () => {
    const filters = createDefaultAdvancedShipSearchFilters();
    filters.experimental = ["yes"];
    expect(matchesAdvancedShipSearchFilters(rows[0]!, filters)).toBe(true);
    expect(matchesAdvancedShipSearchFilters(rows[1]!, filters)).toBe(false);
  });
});

describe("totalWeaponCount", () => {
  it("adds experimental seat as one weapon when present", () => {
    expect(
      totalWeaponCount({ foreWeapons: 5, aftWeapons: 2, experimental: true }),
    ).toBe(8);
    expect(
      totalWeaponCount({ foreWeapons: 4, aftWeapons: 3, experimental: false }),
    ).toBe(7);
  });

  it("treats null/undefined fore, aft, and experimental as zero contribution", () => {
    expect(
      totalWeaponCount({
        foreWeapons: null,
        aftWeapons: undefined,
        experimental: null,
      }),
    ).toBe(0);
    expect(
      totalWeaponCount({
        foreWeapons: 3,
        aftWeapons: null,
        experimental: undefined,
      }),
    ).toBe(3);
    expect(
      totalWeaponCount({
        foreWeapons: 4,
        aftWeapons: 2,
        experimental: false,
      }),
    ).toBe(6);
  });
});

describe("acquisition option grouping", () => {
  it("classifies primary acquisition methods", () => {
    expect(classifyAcquisitionPrimary("LC")).toBe("lobi");
    expect(classifyAcquisitionPrimary("Zen")).toBe("zen");
    expect(classifyAcquisitionPrimary("LB")).toBe("lockBox");
    expect(classifyAcquisitionPrimary("PPP5")).toBe("phoenix");
    expect(classifyAcquisitionPrimary("APP")).toBe("prizePack");
    expect(classifyAcquisitionPrimary("60thIconPack")).toBe("prizePack");
    expect(classifyAcquisitionPrimary("FC")).toBeNull();
    expect(classifyAcquisitionPrimary("SRFED5")).toBeNull();
  });

  it("orders primary methods then divider then secondary A→Z", () => {
    const items = buildAcquisitionSelectItems([
      "FC",
      "APP",
      "Zen",
      "SRFED5",
      "PPP5",
      "LB",
      "60thIconPack",
      "LC",
      "Dil",
    ]);

    const values = items.map((item) =>
      "type" in item && item.type === "divider" ? "—" : item.value,
    );

    expect(values).toEqual([
      "LC",
      "Zen",
      "LB",
      "PPP5",
      "60thIconPack",
      "APP",
      "—",
      "FC",
      "Dil",
      "SRFED5",
    ]);
  });

  it("alpha-sorts prize packs among themselves in the primary block", () => {
    const items = buildAcquisitionSelectItems([
      "60thIconPack",
      "APP",
      "Zen",
    ]);
    const values = items
      .filter(
        (item): item is { title: string; value: string } => !("type" in item),
      )
      .map((item) => item.value);
    expect(values).toEqual(["Zen", "60thIconPack", "APP"]);
  });
});

describe("filter panel prefs", () => {
  it("defaults expanded and persists collapse preference", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };

    expect(loadAdvancedShipSearchFilterPrefs(storage).expanded).toBe(true);
    saveAdvancedShipSearchFilterPrefs({ expanded: false }, storage);
    expect(memory.get(ADVANCED_SHIP_SEARCH_FILTER_PREFS_KEY)).toContain(
      '"expanded":false',
    );
    expect(loadAdvancedShipSearchFilterPrefs(storage).expanded).toBe(false);
  });
});

describe("derive + sort", () => {
  it("labels consoles and acquisition on derived rows", () => {
    const row = deriveAdvancedShipSearchRow(
      ship({
        id: 1,
        name: "Achilles Miracle Worker Heavy Destroyer",
        foreWeapons: 5,
        aftWeapons: 2,
        experimental: true,
        equipCannons: true,
        tacticalSlots: 5,
        engineeringSlots: 2,
        scienceSlots: 4,
        boffs: "Commander Tactical-Miracle Worker",
        cost: "3000;Zen",
        tier: 6,
      }),
      new Set(),
    );
    expect(row.consoleLabel).toContain("ENG");
    expect(row.consoleLabel).toContain("UNI");
    expect(row.acquisitionLabel).toContain("Zen");
    expect(row.fullSpecs).toEqual(["Miracle Worker"]);
    expect(row.dualCannons).toBe(true);
    expect(row.totalWeapons).toBe(8);
  });

  it("sorts by weapon counts and name tie-break", () => {
    const rows = indexAdvancedShipSearchRows([
      ship({ id: 1, name: "Bravo", foreWeapons: 4 }),
      ship({ id: 2, name: "Alpha", foreWeapons: 5 }),
      ship({ id: 3, name: "Charlie", foreWeapons: 4 }),
    ]);
    const sorted = sortAdvancedShipSearchRows(rows, {
      key: "foreWeapons",
      direction: "desc",
    });
    expect(sorted.map((row) => row.name)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it("sorts by totalWeapons including experimental", () => {
    const rows = indexAdvancedShipSearchRows([
      ship({
        id: 1,
        name: "Low",
        foreWeapons: 3,
        aftWeapons: 2,
        experimental: false,
      }),
      ship({
        id: 2,
        name: "High Exp",
        foreWeapons: 4,
        aftWeapons: 3,
        experimental: true,
      }),
      ship({
        id: 3,
        name: "Mid",
        foreWeapons: 4,
        aftWeapons: 3,
        experimental: false,
      }),
    ]);
    const sorted = sortAdvancedShipSearchRows(rows, {
      key: "totalWeapons",
      direction: "desc",
    });
    expect(sorted.map((row) => [row.name, row.totalWeapons])).toEqual([
      ["High Exp", 8],
      ["Mid", 7],
      ["Low", 5],
    ]);
  });
});
