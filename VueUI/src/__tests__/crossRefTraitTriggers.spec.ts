import { describe, expect, it } from "vitest";
import { extractTraitTriggers } from "@/logic/loadout/extractTraitTriggers";
import {
  collectSeatedTriggerFills,
  crossRefTraitTriggers,
  crossRefTraitTriggersAgainstLoadout,
  orderTraitTriggersForPanel,
  resolveSeatedProfession,
} from "@/logic/loadout/crossRefTraitTriggers";
import {
  MOCK_CAPTAIN_POWERS,
  MOCK_HANGAR_PETS,
  MOCK_HULL_SLOTS,
  MOCK_TRAIT_SOURCES,
  MOCK_TRAY_SKILLS,
  MOCK_WEAPONS,
  mockCatalog,
  mockHangarFill,
  mockSeatedCaptain,
  mockSeatedHangar,
  mockSeatedTray,
  mockSeatedWeapon,
  mockTrayFill,
} from "./mocks/traitTriggerFixtures";

describe("resolveSeatedProfession", () => {
  it("maps tray-skill type aliases onto profession vocabulary", () => {
    expect(resolveSeatedProfession("Tactical")).toBe("Tactical");
    expect(resolveSeatedProfession("Intel")).toBe("Intelligence");
    expect(resolveSeatedProfession("Temporal")).toBe("Temporal Operative");
    expect(resolveSeatedProfession("Miracle Worker")).toBe("Miracle Worker");
    expect(resolveSeatedProfession(null)).toBeNull();
    expect(resolveSeatedProfession("")).toBeNull();
  });
});

describe("crossRefTraitTriggers — acceptance", () => {
  it("EPtW seated → Emergency Weapon Cycle satisfied", () => {
    const triggers = extractTraitTriggers(
      MOCK_TRAIT_SOURCES.emergencyWeaponCycle,
    );
    const rows = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.eptw),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("namedAbility");
    expect(rows[0]?.satisfied).toBe(true);
    expect(rows[0]?.label).toBe("Emergency Power to Weapons");
    expect(rows[0]?.matchedItems.map((m) => m.name)).toEqual([
      "Emergency Power to Weapons",
    ]);
  });

  it("Science BOff power seated → Spore-Infused Anomalies satisfied", () => {
    const triggers = extractTraitTriggers(
      MOCK_TRAIT_SOURCES.sporeInfusedAnomalies,
    );
    const rows = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.gravityWell),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("professionCategory");
    expect(rows[0]?.satisfied).toBe(true);
    expect(rows[0]?.matchedItems[0]?.name).toBe("Gravity Well");
  });

  it("Intelligence BOff power also satisfies Spore-Infused Anomalies", () => {
    const triggers = extractTraitTriggers(
      MOCK_TRAIT_SOURCES.sporeInfusedAnomalies,
    );
    const rows = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.viralImpulse),
    ]);
    expect(rows[0]?.satisfied).toBe(true);
  });

  it("nothing relevant seated → not satisfied", () => {
    const ewc = crossRefTraitTriggers(
      extractTraitTriggers(MOCK_TRAIT_SOURCES.emergencyWeaponCycle),
      [mockSeatedTray(MOCK_TRAY_SKILLS.tacticalTeam)],
    );
    expect(ewc[0]?.satisfied).toBe(false);
    expect(ewc[0]?.matchedItems).toEqual([]);

    const spore = crossRefTraitTriggers(
      extractTraitTriggers(MOCK_TRAIT_SOURCES.sporeInfusedAnomalies),
      [mockSeatedTray(MOCK_TRAY_SKILLS.eptw)],
    );
    expect(spore[0]?.satisfied).toBe(false);

    const empty = crossRefTraitTriggers(
      extractTraitTriggers(MOCK_TRAIT_SOURCES.emergencyWeaponCycle),
      [],
    );
    expect(empty[0]?.satisfied).toBe(false);
  });
});

describe("crossRefTraitTriggers — readiness examples", () => {
  it("All Hands on Deck: Tac or Command seating satisfies; Science alone does not", () => {
    const triggers = extractTraitTriggers(MOCK_TRAIT_SOURCES.allHandsOnDeck);
    expect(triggers[0]?.kind).toBe("professionCategory");

    const withTac = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.tacticalTeam),
    ]);
    expect(withTac[0]?.satisfied).toBe(true);

    const withCommand = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.concentrateFirepower),
    ]);
    expect(withCommand[0]?.satisfied).toBe(true);

    const withScienceOnly = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.scienceTeam),
    ]);
    expect(withScienceOnly[0]?.satisfied).toBe(false);
  });

  it("Broadside Beam Support: FAW or Overload seated independently", () => {
    const triggers = extractTraitTriggers(
      MOCK_TRAIT_SOURCES.broadsideBeamSupport,
    );
    expect(triggers.map((t) => t.kind)).toEqual([
      "namedAbility",
      "namedAbility",
      "weaponClass",
    ]);

    const withFaw = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.faw),
    ]);
    expect(withFaw.map((r) => r.satisfied)).toEqual([true, false, false]);
    expect(withFaw[0]?.matchedItems[0]?.name).toBe("Beams: Fire at Will");

    const withOverload = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.beamOverload),
    ]);
    expect(withOverload.map((r) => r.satisfied)).toEqual([false, true, false]);

    const withBoth = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.faw, "boff-0-ensign"),
      mockSeatedTray(MOCK_TRAY_SKILLS.beamOverload, "boff-0-lieutenant"),
    ]);
    expect(withBoth.map((r) => r.satisfied)).toEqual([true, true, false]);
  });

  it("Directed Energy Flux: Temporal OR DEM (either leg)", () => {
    const triggers = extractTraitTriggers(
      MOCK_TRAIT_SOURCES.directedEnergyFlux,
    );
    expect(triggers.map((t) => t.kind)).toEqual([
      "namedAbility",
      "professionCategory",
    ]);

    const withDem = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.dem),
    ]);
    expect(withDem[0]?.satisfied).toBe(true);
    expect(withDem[1]?.satisfied).toBe(false);

    const withTemporal = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.recursiveShearing),
    ]);
    expect(withTemporal[0]?.satisfied).toBe(false);
    expect(withTemporal[1]?.satisfied).toBe(true);

    const withNeither = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.beamOverload),
    ]);
    expect(withNeither.every((r) => r.satisfied === false)).toBe(true);
  });
});

describe("crossRefTraitTriggers — functional & combat state", () => {
  it("control functional category matches curated control powers only", () => {
    const triggers = extractTraitTriggers(MOCK_TRAIT_SOURCES.checkmate);
    const withControl = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.jamSensors),
    ]);
    expect(withControl[0]?.satisfied).toBe(true);

    const withNonControl = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.scienceTeam),
    ]);
    expect(withNonControl[0]?.satisfied).toBe(false);
  });

  it("hangarPets satisfied by seated hangar fills", () => {
    const triggers = [
      {
        kind: "functionalCategory" as const,
        category: "hangarPets" as const,
        display: "Hangar pets",
      },
    ];
    const withPet = crossRefTraitTriggers(triggers, [
      mockSeatedHangar(MOCK_HANGAR_PETS.fighters),
    ]);
    expect(withPet[0]?.satisfied).toBe(true);
    expect(withPet[0]?.matchedItems[0]?.name).toBe(
      "Hangar - Peregrine Fighters",
    );

    const without = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.tacticalTeam),
    ]);
    expect(without[0]?.satisfied).toBe(false);
  });

  it("captainAbility matches explicit captain powers and curated names", () => {
    const triggers = [
      {
        kind: "functionalCategory" as const,
        category: "captainAbility" as const,
        display: "Captain ability",
      },
    ];
    const withCaptain = crossRefTraitTriggers(triggers, [
      mockSeatedCaptain(MOCK_CAPTAIN_POWERS.evasive),
    ]);
    expect(withCaptain[0]?.satisfied).toBe(true);
    expect(withCaptain[0]?.matchedItems[0]?.catalogKind).toBe(
      "captainAbility",
    );

    const without = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.tacticalTeam),
    ]);
    expect(without[0]?.satisfied).toBe(false);
  });

  it("combatState is satisfied without seating (combat-action only)", () => {
    const triggers = extractTraitTriggers(MOCK_TRAIT_SOURCES.punchIt);
    const rows = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.eptw),
      mockSeatedHangar(MOCK_HANGAR_PETS.tods),
    ]);
    expect(rows).toEqual([
      {
        label: "When below 50% Hull Strength",
        kind: "combatState",
        satisfied: true,
        matchedItems: [],
        trigger: triggers[0],
      },
    ]);
  });

  it("Beam Barrage satisfied by slotted beam weapon, not cannon or empty", () => {
    const triggers = extractTraitTriggers(MOCK_TRAIT_SOURCES.beamBarrage);
    expect(triggers[0]?.kind).toBe("weaponClass");

    const withBeam = crossRefTraitTriggers(triggers, [
      mockSeatedWeapon(MOCK_WEAPONS.phaserBeamArray),
    ]);
    expect(withBeam[0]?.satisfied).toBe(true);
    expect(withBeam[0]?.matchedItems[0]?.name).toBe("Phaser Beam Array");

    const withCannon = crossRefTraitTriggers(triggers, [
      mockSeatedWeapon(MOCK_WEAPONS.dualCannons),
    ]);
    expect(withCannon[0]?.satisfied).toBe(false);

    const empty = crossRefTraitTriggers(triggers, []);
    expect(empty[0]?.satisfied).toBe(false);
  });

  it("Broadside weaponClass satisfied by beam weapon alongside FAW", () => {
    const triggers = extractTraitTriggers(
      MOCK_TRAIT_SOURCES.broadsideBeamSupport,
    );
    const weapon = triggers.find((t) => t.kind === "weaponClass");
    expect(weapon).toBeDefined();

    const withBeamAndBothModes = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.faw),
      mockSeatedTray(MOCK_TRAY_SKILLS.beamOverload, "boff-0-lieutenant"),
      mockSeatedWeapon(MOCK_WEAPONS.phaserBeamArray),
    ]);
    expect(withBeamAndBothModes.every((t) => t.satisfied === true)).toBe(true);

    const abilitiesOnly = crossRefTraitTriggers(triggers, [
      mockSeatedTray(MOCK_TRAY_SKILLS.faw),
      mockSeatedTray(MOCK_TRAY_SKILLS.beamOverload, "boff-0-lieutenant"),
    ]);
    const weaponRow = abilitiesOnly.find((t) => t.kind === "weaponClass");
    expect(weaponRow?.satisfied).toBe(false);
  });
});

describe("collectSeatedTriggerFills / against loadout", () => {
  it("resolves traySkill and hangar fills from slots + catalog", () => {
    const catalog = mockCatalog(
      MOCK_TRAY_SKILLS.eptw,
      MOCK_HANGAR_PETS.fighters,
    );
    const fills = collectSeatedTriggerFills({
      slots: [
        mockTrayFill(MOCK_TRAY_SKILLS.eptw),
        mockHangarFill(MOCK_HANGAR_PETS.fighters),
      ],
      catalog,
      hullSlots: MOCK_HULL_SLOTS,
      captainPowers: [MOCK_CAPTAIN_POWERS.apa],
    });

    expect(fills).toHaveLength(3);
    expect(fills.map((f) => f.name).sort()).toEqual([
      "Attack Pattern Alpha",
      "Emergency Power to Weapons",
      "Hangar - Peregrine Fighters",
    ]);
    expect(fills.find((f) => f.name.includes("Peregrine"))?.slotKind).toBe(
      "hangar",
    );
  });

  it("crossRefTraitTriggersAgainstLoadout wires slots → satisfaction", () => {
    const catalog = mockCatalog(MOCK_TRAY_SKILLS.eptw, MOCK_TRAY_SKILLS.faw);
    const rows = crossRefTraitTriggersAgainstLoadout(
      extractTraitTriggers(MOCK_TRAIT_SOURCES.emergencyWeaponCycle),
      {
        slots: [mockTrayFill(MOCK_TRAY_SKILLS.eptw)],
        catalog,
      },
    );
    expect(rows[0]?.satisfied).toBe(true);
  });
});

describe("orderTraitTriggersForPanel", () => {
  it("orders unsatisfied, then satisfied (incl. combat-state)", () => {
    const ordered = orderTraitTriggersForPanel([
      {
        label: "Combat",
        kind: "combatState",
        satisfied: true,
        matchedItems: [],
        trigger: { kind: "combatState", display: "Combat" },
      },
      {
        label: "FAW",
        kind: "namedAbility",
        satisfied: true,
        matchedItems: [],
        trigger: {
          kind: "namedAbility",
          abilityName: "Beams: Fire at Will",
          display: "FAW",
        },
      },
      {
        label: "Overload",
        kind: "namedAbility",
        satisfied: false,
        matchedItems: [],
        trigger: {
          kind: "namedAbility",
          abilityName: "Beams: Overload",
          display: "Overload",
        },
      },
    ]);
    expect(ordered.map((r) => r.label)).toEqual([
      "Overload",
      "Combat",
      "FAW",
    ]);
  });
});
