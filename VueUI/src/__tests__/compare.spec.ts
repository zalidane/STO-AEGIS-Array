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
  comparePath,
  compareToggleLabel,
  normalizeCompareIds,
  parseCompareQuery,
  toggleCompareId,
} from "@/logic/compare/selection";

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
  it("keeps at most two unique hull ids", () => {
    expect(normalizeCompareIds([2, 2, 1, 3])).toEqual([2, 1]);
    expect(toggleCompareId([], 4)).toEqual([4]);
    expect(toggleCompareId([4], 4)).toEqual([]);
    expect(toggleCompareId([4], 9)).toEqual([4, 9]);
    expect(toggleCompareId([4, 9], 11)).toEqual([4, 11]);
    expect(canOpenCompare([4, 9])).toBe(true);
    expect(canOpenCompare([4])).toBe(false);
  });

  it("builds a compare path and reads query ids", () => {
    expect(comparePath([])).toBe("/ships/compare");
    expect(comparePath([4])).toBe("/ships/compare?a=4");
    expect(comparePath([4, 9])).toBe("/ships/compare?a=4&b=9");
    expect(parseCompareQuery({ a: "4", b: "9" })).toEqual([4, 9]);
    expect(compareToggleLabel([4, 9], 11)).toBe("Replace compared hull");
    expect(compareToggleLabel([4, 9], 4)).toBe("Remove from compare");
  });
});

describe("compare rows", () => {
  it("parses wiki hull strings and marks the tougher hull", () => {
    expect(parseCompareNumber("47,850")).toBe(47850);
    const hull = buildPhysicalStatRows(escort, cruiser).find((row) => row.key === "hull");
    expect(hull?.left).toBe("35,000");
    expect(hull?.right).toBe("50,000");
    expect(hull?.advantage).toBe("right");
    const turn = buildPhysicalStatRows(escort, cruiser).find(
      (row) => row.key === "turnRate",
    );
    expect(turn?.advantage).toBe("left");
    const inertia = buildPhysicalStatRows(escort, cruiser).find(
      (row) => row.key === "inertia",
    );
    expect(inertia?.advantage).toBe("left");
  });

  it("compares weapon slots and treats an experimental seat as an advantage", () => {
    const rows = buildWeaponSlotRows(escort, cruiser);
    expect(rows.find((row) => row.key === "aft")?.advantage).toBe("right");
    expect(rows.find((row) => row.key === "experimental")?.left).toBe("Yes");
    expect(rows.find((row) => row.key === "experimental")?.advantage).toBe("left");
  });

  it("pads BOff seats so both columns keep the same row count", () => {
    const rows = buildBoffRows(escort, {
      ...cruiser,
      boffs: "Commander Engineering",
    });
    expect(rows).toHaveLength(2);
    expect(rows[1]?.right).toBe("—");
  });

  it("highlights identical BOff seats even when they sit in different positions", () => {
    const rows = buildBoffRows(
      {
        ...escort,
        boffs: "Commander Tactical,Lieutenant Engineering,Ensign Science",
      },
      {
        ...cruiser,
        boffs: "Ensign Science,Lieutenant Tactical,Commander Tactical",
      },
    );
    expect(rows[0]?.left).toBe("Cmdr TAC");
    expect(rows[0]?.leftMatch).toBe(true);
    expect(rows[0]?.right).toBe("Ens SCI");
    expect(rows[0]?.rightMatch).toBe(true);
    expect(rows[1]?.left).toBe("Lt ENG");
    expect(rows[1]?.leftMatch).toBe(false);
    expect(rows[1]?.right).toBe("Lt TAC");
    expect(rows[1]?.rightMatch).toBe(false);
    expect(rows[2]?.left).toBe("Ens SCI");
    expect(rows[2]?.leftMatch).toBe(true);
    expect(rows[2]?.right).toBe("Cmdr TAC");
    expect(rows[2]?.rightMatch).toBe(true);
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

  it("lists costs by currency without picking a winner", () => {
    const rows = buildCostRows(escort, cruiser);
    expect(rows.map((row) => row.key)).toEqual(["cost-Zen", "cost-LB"]);
    expect(rows[0]?.advantage).toBeNull();
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
});
