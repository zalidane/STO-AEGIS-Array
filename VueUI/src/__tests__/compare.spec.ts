import { describe, expect, it } from "vitest";
import {
  buildAccessoryRows,
  buildBoffRows,
  buildCompareSections,
  buildConsoleSlotRows,
  buildCostRows,
  buildPhysicalStatRows,
  buildWeaponSlotRows,
  parseCompareNumber,
  type CompareHull,
} from "@/logic/compare/rows";
import {
  canOpenCompare,
  COMPARE_HULL_LIMIT,
  comparePath,
  compareToggleLabel,
  normalizeCompareIds,
  parseCompareQuery,
  quickCompareHullIds,
  toggleCompareId,
} from "@/logic/compare/selection";
import { buildMultiCompareSections } from "@/logic/compare/multi";

const escort: CompareHull = {
  id: 1,
  name: "Escort",
  hull: "35000",
  hullMod: 1.0,
  shieldMod: 0.9,
  turnRate: 16,
  impulse: 0.2,
  inertia: 40,
  powerAll: 10,
  foreWeapons: 4,
  aftWeapons: 3,
  experimental: true,
  equipCannons: true,
  devices: 2,
  hangars: 0,
  secondaryDeflector: false,
  tacticalSlots: 4,
  engineeringSlots: 2,
  scienceSlots: 2,
  tier: 6,
  boffs: "Commander Tactical,Lieutenant Commander Engineering",
  cost: "3000;Zen",
  uniconsole: "Console - Universal - Escort",
  abilities: "Cannon: Rapid Fire,Tactical Team",
};

const cruiser: CompareHull = {
  id: 2,
  name: "Cruiser",
  hull: "50000",
  hullMod: 1.4,
  shieldMod: 1.1,
  turnRate: 8,
  impulse: 0.15,
  inertia: 70,
  powerWeapons: 12,
  powerShields: 15,
  powerEngines: 10,
  powerAuxiliary: 10,
  foreWeapons: 4,
  aftWeapons: 4,
  experimental: false,
  equipCannons: false,
  devices: 4,
  hangars: 1,
  secondaryDeflector: false,
  tacticalSlots: 3,
  engineeringSlots: 4,
  scienceSlots: 3,
  tier: 6,
  boffs: "Commander Engineering,Lieutenant Commander Tactical",
  cost: "1;LB",
  abilities: "Engineering Team",
};

describe("compare selection", () => {
  it("keeps at most four unique hull ids and opens from two", () => {
    expect(COMPARE_HULL_LIMIT).toBe(4);
    expect(normalizeCompareIds([2, 2, 1, 3, 8, 5])).toEqual([2, 1, 3, 8]);
    expect(toggleCompareId([], 4)).toEqual([4]);
    expect(toggleCompareId([4], 4)).toEqual([]);
    expect(toggleCompareId([4], 9)).toEqual([4, 9]);
    expect(toggleCompareId([4, 9], 11)).toEqual([4, 9, 11]);
    expect(toggleCompareId([4, 9, 11, 2], 7)).toEqual([4, 9, 11, 7]);
    expect(canOpenCompare([4])).toBe(false);
    expect(canOpenCompare([4, 9])).toBe(true);
    expect(canOpenCompare([4, 9, 11])).toBe(true);
    expect(canOpenCompare([4, 9, 11, 2])).toBe(true);
  });

  it("builds a compare path and reads query ids", () => {
    expect(comparePath([])).toBe("/ships/compare");
    expect(comparePath([4])).toBe("/ships/compare?a=4");
    expect(comparePath([4, 9])).toBe("/ships/compare?a=4&b=9");
    expect(comparePath([4, 9, 11, 2])).toBe(
      "/ships/compare?a=4&b=9&c=11&d=2",
    );
    expect(parseCompareQuery({ a: "4", b: "9" })).toEqual([4, 9]);
    expect(parseCompareQuery({ a: "4", b: "9", c: "11", d: "2" })).toEqual([
      4, 9, 11, 2,
    ]);
    expect(parseCompareQuery({ a: "4", b: "9", c: "nope" })).toEqual([4, 9]);
    expect(compareToggleLabel([4, 9], 11)).toBe("Select for compare");
    expect(compareToggleLabel([4, 9, 11, 2], 8)).toBe("Replace compared hull");
    expect(compareToggleLabel([4, 9], 4)).toBe("Remove from compare");
  });

  it("puts the ship on screen first and does not repeat it", () => {
    expect(quickCompareHullIds(1, [1, 2, 3])).toEqual([1, 2, 3]);
    expect(quickCompareHullIds(9, [1, 2])).toEqual([9, 1, 2]);
    expect(quickCompareHullIds(9, [9])).toEqual([9]);
    expect(quickCompareHullIds(0, [1, 2, 1])).toEqual([1, 2]);
  });
});

describe("compare rows", () => {
  it("parses wiki hull strings and marks the tougher hull", () => {
    expect(parseCompareNumber("47,850")).toBe(47850);
    const hull = buildPhysicalStatRows(escort, cruiser).find((row) => row.key === "hull");
    expect(hull?.left).toBe("35,000");
    expect(hull?.right).toBe("50,000");
    expect(hull?.rightTone).toBe("improve");
    const turn = buildPhysicalStatRows(escort, cruiser).find(
      (row) => row.key === "turnRate",
    );
    expect(turn?.rightTone).toBe("decrease");
    const inertia = buildPhysicalStatRows(escort, cruiser).find(
      (row) => row.key === "inertia",
    );
    expect(inertia?.rightTone).toBe("decrease");
  });

  it("compares weapon slots and treats an experimental seat as an advantage", () => {
    const rows = buildWeaponSlotRows(escort, cruiser);
    expect(rows.find((row) => row.key === "aft")?.rightTone).toBe("improve");
    expect(rows.find((row) => row.key === "experimental")?.left).toBe("Yes");
    expect(rows.find((row) => row.key === "experimental")?.rightTone).toBe(
      "decrease",
    );
  });

  it("pads BOff seats so both columns keep the same row count", () => {
    const rows = buildBoffRows(escort, {
      ...cruiser,
      boffs: "Commander Engineering",
    });
    expect(rows).toHaveLength(2);
    expect(rows[1]?.right).toBe("—");
  });

  it("orders BOff seats Commander to Ensign, then type alphabetically", () => {
    const rows = buildBoffRows(
      {
        ...escort,
        boffs:
          "Ensign Science,Lieutenant Tactical,Commander Universal-Miracle Worker,Commander Engineering",
      },
      escort,
    );
    expect(rows.map((row) => row.left)).toEqual([
      "Cmdr ENG",
      "Cmdr UNI-MW",
      "Lt TAC",
      "Ens SCI",
    ]);
  });

  it("highlights different BOff seats on the right hull", () => {
    const rows = buildBoffRows(
      {
        ...escort,
        boffs: "Commander Tactical,Lieutenant Tactical,Ensign Science",
      },
      {
        ...cruiser,
        boffs: "Commander Engineering,Lieutenant Tactical,Ensign Science",
      },
    );
    expect(rows[0]?.left).toBe("Cmdr TAC");
    expect(rows[0]?.right).toBe("Cmdr ENG");
    expect(rows[0]?.rightTone).toBe("diff");
    expect(rows[1]?.left).toBe("Lt TAC");
    expect(rows[1]?.right).toBe("Lt TAC");
    expect(rows[1]?.rightTone).toBeNull();
    expect(rows[2]?.left).toBe("Ens SCI");
    expect(rows[2]?.right).toBe("Ens SCI");
    expect(rows[2]?.rightTone).toBeNull();
  });

  it("compares stock accessories without T5-U or T6-X extras", () => {
    const rows = buildAccessoryRows(
      {
        ...escort,
        tier: 6,
        t5uConsole: "tac",
        devices: 2,
        tacticalSlots: 4,
        boffs: "Commander Tactical",
      },
      {
        ...cruiser,
        tier: 5,
        t5uConsole: "eng",
        devices: 4,
        engineeringSlots: 4,
      },
    );
    expect(rows.find((row) => row.key === "devices")?.left).toBe("2");
    expect(rows.find((row) => row.key === "tac")).toBeUndefined();
    expect(rows.find((row) => row.key === "extras")).toBeUndefined();
  });

  it("lists stock console slots in their own section", () => {
    const rows = buildConsoleSlotRows(
      {
        ...escort,
        tier: 6,
        t5uConsole: "tac",
        tacticalSlots: 4,
        engineeringSlots: 2,
        scienceSlots: 2,
        boffs: "Commander Tactical",
      },
      {
        ...cruiser,
        tier: 5,
        t5uConsole: "eng",
        engineeringSlots: 4,
      },
    );
    expect(rows.map((row) => row.key)).toEqual(["eng", "sci", "tac", "uni"]);
    expect(rows.find((row) => row.key === "tac")?.left).toBe("4");
    expect(rows.find((row) => row.key === "eng")?.right).toBe("4");
    expect(rows.find((row) => row.key === "uni")?.left).toBe("0");
  });

  it("counts a Commander Miracle Worker universal on the stock hull", () => {
    const rows = buildConsoleSlotRows(
      {
        ...escort,
        boffs: "Commander Tactical-Miracle Worker,Lieutenant Science",
      },
      cruiser,
    );
    expect(rows.find((row) => row.key === "uni")?.left).toBe("1");
    expect(rows.find((row) => row.key === "uni")?.right).toBe("0");
  });

  it("marks extra devices as an improvement and extra consoles the same way", () => {
    const devices = buildAccessoryRows(escort, cruiser).find(
      (row) => row.key === "devices",
    );
    expect(devices?.left).toBe("2");
    expect(devices?.right).toBe("4");
    expect(devices?.rightTone).toBe("improve");
    const tac = buildConsoleSlotRows(escort, cruiser).find(
      (row) => row.key === "tac",
    );
    expect(tac?.left).toBe("4");
    expect(tac?.right).toBe("3");
    expect(tac?.rightTone).toBe("decrease");
  });

  it("lists costs by currency as a difference, not a winner", () => {
    const rows = buildCostRows(escort, cruiser);
    expect(rows.map((row) => row.key)).toEqual(["cost-Zen", "cost-LB"]);
    expect(rows[0]?.rightTone).toBe("diff");
    expect(rows[0]?.differs).toBe(true);
  });

  it("emits compare sections with console slots after BOff seating", () => {
    expect(buildCompareSections(escort, cruiser).map((section) => section.id)).toEqual([
      "physical",
      "weapons",
      "boffs",
      "consoles",
      "accessories",
      "costs",
    ]);
  });

  it("lines up more than two hulls on the same rows as a pair", () => {
    const raider: CompareHull = {
      ...escort,
      id: 3,
      name: "Raider",
      hull: "28000",
      foreWeapons: 5,
      aftWeapons: 1,
      boffs: "Commander Tactical",
      abilities: "Enhanced Battle Cloak",
      cost: "900;LC",
    };
    const pair = buildCompareSections(escort, cruiser);
    const multi = buildMultiCompareSections([escort, cruiser, raider]);
    expect(multi.map((section) => section.id)).toEqual(
      pair.map((section) => section.id),
    );
    const weapons = multi.find((section) => section.id === "weapons");
    const fore = weapons?.rows.find((row) => row.key === "fore");
    expect(fore?.cells.map((cell) => cell.text)).toEqual(["4", "4", "5"]);
    expect(fore?.cells[1]?.tone).toBeNull();
    expect(fore?.cells[2]?.tone).toBe("improve");

    const boffs = multi.find((section) => section.id === "boffs");
    expect(boffs?.rows).toHaveLength(2);
    expect(boffs?.rows[1]?.cells.map((cell) => cell.text)).toEqual([
      "LtCmdr ENG",
      "LtCmdr TAC",
      "—",
    ]);

    const costs = multi.find((section) => section.id === "costs");
    expect(costs?.rows.map((row) => row.key)).toEqual([
      "cost-Zen",
      "cost-LB",
      "cost-LC",
    ]);
    const lobi = costs?.rows.find((row) => row.key === "cost-LC");
    expect(lobi?.cells.map((cell) => cell.text)).toEqual([
      "—",
      "—",
      "900 Lobi Crystal",
    ]);

    const two = buildMultiCompareSections([escort, cruiser]);
    expect(two.map((section) => section.rows.map((row) => row.key))).toEqual(
      pair.map((section) => section.rows.map((row) => row.key)),
    );
    expect(
      two.map((section) => section.rows.map((row) => row.cells[1]?.tone)),
    ).toEqual(pair.map((section) => section.rows.map((row) => row.rightTone)));
  });
});
