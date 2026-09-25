import { describe, expect, it } from "vitest";
import {
  buildTraitTriggersPanel,
  personalTraitToTriggerText,
  traitTriggerSatisfactionMark,
  traitTriggerSatisfactionState,
  traitTextSourceFromItem,
} from "@/logic/loadout/buildTraitTriggersPanel";
import {
  MOCK_TRAIT_SOURCES,
  MOCK_TRAY_SKILLS,
  mockCatalog,
  mockTrayFill,
} from "./mocks/traitTriggerFixtures";
import type { LoadoutItem } from "@/logic/loadout/types";

const ewcItem: LoadoutItem = {
  id: 5010,
  name: MOCK_TRAIT_SOURCES.emergencyWeaponCycle.name,
  type: "starship trait",
  catalogKind: "starshipTrait",
  short: MOCK_TRAIT_SOURCES.emergencyWeaponCycle.short,
  basic: MOCK_TRAIT_SOURCES.emergencyWeaponCycle.basic,
  detailed: MOCK_TRAIT_SOURCES.emergencyWeaponCycle.detailed,
  image: "/images/starship-traits/Emergency_Weapon_Cycle_icon.png",
};

const sporeItem: LoadoutItem = {
  id: 5011,
  name: MOCK_TRAIT_SOURCES.sporeInfusedAnomalies.name,
  type: "starship trait",
  catalogKind: "starshipTrait",
  short: MOCK_TRAIT_SOURCES.sporeInfusedAnomalies.short,
  basic: MOCK_TRAIT_SOURCES.sporeInfusedAnomalies.basic,
  detailed: MOCK_TRAIT_SOURCES.sporeInfusedAnomalies.detailed,
};

const punchItItem: LoadoutItem = {
  id: 5012,
  name: MOCK_TRAIT_SOURCES.punchIt.name,
  type: "starship trait",
  catalogKind: "starshipTrait",
  short: MOCK_TRAIT_SOURCES.punchIt.short,
  basic: MOCK_TRAIT_SOURCES.punchIt.basic,
  detailed: MOCK_TRAIT_SOURCES.punchIt.detailed,
};

describe("traitTriggerSatisfactionMark / state", () => {
  it("maps satisfied / unsatisfied / descriptive", () => {
    expect(traitTriggerSatisfactionMark(true)).toBe("✓");
    expect(traitTriggerSatisfactionMark(false)).toBe("✗");
    expect(traitTriggerSatisfactionMark(null)).toBeNull();
    expect(traitTriggerSatisfactionState(true)).toBe("satisfied");
    expect(traitTriggerSatisfactionState(false)).toBe("unsatisfied");
    expect(traitTriggerSatisfactionState(null)).toBe("descriptive");
  });
});

describe("personalTraitToTriggerText", () => {
  it("maps shortDescription / description onto short / basic", () => {
    expect(
      personalTraitToTriggerText({
        name: "Beam Barrage",
        shortDescription: "On Beam: Overload…",
        description: "* Upon activating [[Beams: Overload]]…",
      }),
    ).toEqual({
      name: "Beam Barrage",
      short: "On Beam: Overload…",
      basic: "* Upon activating [[Beams: Overload]]…",
      detailed: null,
    });
  });
});

describe("traitTextSourceFromItem", () => {
  it("passes through starship-trait Cargo fields", () => {
    expect(traitTextSourceFromItem(ewcItem)).toEqual({
      name: ewcItem.name,
      short: ewcItem.short,
      basic: ewcItem.basic,
      detailed: ewcItem.detailed,
    });
  });
});

describe("buildTraitTriggersPanel", () => {
  it("returns empty when no traits are seated", () => {
    const rows = buildTraitTriggersPanel({
      slots: [mockTrayFill(MOCK_TRAY_SKILLS.eptw)],
      catalog: mockCatalog(MOCK_TRAY_SKILLS.eptw, ewcItem),
    });
    expect(rows).toEqual([]);
  });

  it("EWC seated + EPtW → ✓; without EPtW → ✗", () => {
    const traitFill = {
      slotId: "starshipTrait-0",
      itemId: ewcItem.id,
      catalogKind: "starshipTrait" as const,
    };

    const unsatisfied = buildTraitTriggersPanel({
      slots: [traitFill],
      catalog: mockCatalog(ewcItem, MOCK_TRAY_SKILLS.tacticalTeam),
    });
    expect(unsatisfied).toHaveLength(1);
    expect(unsatisfied[0]?.traitName).toBe("Emergency Weapon Cycle");
    expect(unsatisfied[0]?.triggers[0]?.satisfied).toBe(false);
    expect(
      traitTriggerSatisfactionMark(unsatisfied[0]!.triggers[0]!.satisfied),
    ).toBe("✗");

    const satisfied = buildTraitTriggersPanel({
      slots: [traitFill, mockTrayFill(MOCK_TRAY_SKILLS.eptw)],
      catalog: mockCatalog(ewcItem, MOCK_TRAY_SKILLS.eptw),
    });
    expect(satisfied[0]?.triggers[0]?.satisfied).toBe(true);
    expect(satisfied[0]?.triggers[0]?.matchedItems[0]?.name).toBe(
      "Emergency Power to Weapons",
    );
  });

  it("Spore-Infused Anomalies satisfied by Science BOff power", () => {
    const rows = buildTraitTriggersPanel({
      slots: [
        {
          slotId: "starshipTrait-0",
          itemId: sporeItem.id,
          catalogKind: "starshipTrait",
        },
        mockTrayFill(MOCK_TRAY_SKILLS.gravityWell),
      ],
      catalog: mockCatalog(sporeItem, MOCK_TRAY_SKILLS.gravityWell),
    });
    expect(rows[0]?.triggers[0]?.kind).toBe("professionCategory");
    expect(rows[0]?.triggers[0]?.satisfied).toBe(true);
  });

  it("combat-state trait shows descriptive-only (satisfied null)", () => {
    const rows = buildTraitTriggersPanel({
      slots: [
        {
          slotId: "starshipTrait-0",
          itemId: punchItItem.id,
          catalogKind: "starshipTrait",
        },
      ],
      catalog: mockCatalog(punchItItem),
    });
    expect(rows[0]?.triggers.some((t) => t.satisfied === null)).toBe(true);
    const combat = rows[0]?.triggers.find((t) => t.kind === "combatState");
    expect(combat).toBeDefined();
    expect(traitTriggerSatisfactionMark(combat!.satisfied)).toBeNull();
    expect(traitTriggerSatisfactionState(combat!.satisfied)).toBe(
      "descriptive",
    );
  });

  it("includes personal traits seated on captain boards", () => {
    const personal: LoadoutItem = {
      id: 900,
      name: "Adaptive Offense",
      type: "char",
      catalogKind: "trait",
      short: "On Emergency Power to Weapons: haste",
      basic:
        "* Upon activating [[Emergency Power to Weapons]], you gain haste.",
    };
    const rows = buildTraitTriggersPanel({
      slots: [
        {
          slotId: "personalSpace-0",
          itemId: personal.id,
          catalogKind: "trait",
        },
        mockTrayFill(MOCK_TRAY_SKILLS.eptw),
      ],
      catalog: mockCatalog(personal, MOCK_TRAY_SKILLS.eptw),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.catalogKind).toBe("trait");
    expect(rows[0]?.triggers[0]?.satisfied).toBe(true);
  });
});
