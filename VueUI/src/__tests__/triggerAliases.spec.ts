import { describe, expect, it } from "vitest";
import {
  ANOMALY_ABILITIES,
  CONTROL_ABILITIES,
  EPTX_ABILITIES,
  abilitiesForFamily,
  abilitiesForFunctionalCategory,
  isAbilityInFamily,
  isAbilityInFunctionalCategory,
  normalizeTriggerAbilityName,
  resolveTriggerAbilityAlias,
} from "@/logic/loadout/triggerAliases";

describe("normalizeTriggerAbilityName", () => {
  it("returns empty for nullish or blank input", () => {
    expect(normalizeTriggerAbilityName(null)).toBe("");
    expect(normalizeTriggerAbilityName(undefined)).toBe("");
    expect(normalizeTriggerAbilityName("   ")).toBe("");
  });

  it("folds case, whitespace, HTML entities, and (ability) suffix", () => {
    expect(normalizeTriggerAbilityName("  Beams: Overload (ability) ")).toBe(
      "beams: overload",
    );
    expect(normalizeTriggerAbilityName("Ability: Beams: Fire at Will")).toBe(
      "beams: fire at will",
    );
    expect(normalizeTriggerAbilityName("Tyken&#039;s Rift")).toBe(
      "tyken's rift",
    );
    expect(normalizeTriggerAbilityName("Beams: Overload I")).toBe(
      "beams: overload",
    );
    expect(normalizeTriggerAbilityName("Cannons: Rapid Fire III")).toBe(
      "cannons: rapid fire",
    );
  });
});

describe("resolveTriggerAbilityAlias", () => {
  it("maps EPtX abbreviations and wiki labels onto catalog names", () => {
    expect(resolveTriggerAbilityAlias("EPtW")).toBe(
      "Emergency Power to Weapons",
    );
    expect(resolveTriggerAbilityAlias("Emergency Power to Weapons")).toBe(
      "Emergency Power to Weapons",
    );
    expect(
      resolveTriggerAbilityAlias("Emergency Power to Weapons (ability)"),
    ).toBe("Emergency Power to Weapons");
    expect(resolveTriggerAbilityAlias("epts")).toBe(
      "Emergency Power to Shields",
    );
    expect(resolveTriggerAbilityAlias("EPTE")).toBe(
      "Emergency Power to Engines",
    );
    expect(resolveTriggerAbilityAlias("EPtA")).toBe(
      "Emergency Power to Auxiliary",
    );
  });

  it("maps firing-mode name drift onto plural catalog forms", () => {
    expect(resolveTriggerAbilityAlias("Beam: Overload (ability)")).toBe(
      "Beams: Overload",
    );
    expect(resolveTriggerAbilityAlias("Beam Overload")).toBe("Beams: Overload");
    expect(resolveTriggerAbilityAlias("Cannon: Scatter Volley")).toBe(
      "Cannons: Scatter Volley",
    );
    expect(resolveTriggerAbilityAlias("Cannon: Rapid Fire")).toBe(
      "Cannons: Rapid Fire",
    );
    expect(resolveTriggerAbilityAlias("Torpedo Spread")).toBe(
      "Torpedoes: Spread",
    );
    expect(resolveTriggerAbilityAlias("Fire at Will")).toBe(
      "Beams: Fire at Will",
    );
    expect(resolveTriggerAbilityAlias("Ability: Beams: Overload")).toBe(
      "Beams: Overload",
    );
  });

  it("includes torpedo firing modes with singular/plural catalog spelling", () => {
    const torpedoModes = [
      "Torpedoes: Spread",
      "Torpedoes: High Yield",
      "Torpedo: Transport Warhead",
      "Torpedoes: Nanite Repair Payload",
    ] as const;

    for (const name of torpedoModes) {
      expect(abilitiesForFamily("firingMode")).toContain(name);
      expect(isAbilityInFamily(name, "firingMode")).toBe(true);
      expect(resolveTriggerAbilityAlias(name)).toBe(name);
      expect(resolveTriggerAbilityAlias(`${name} (ability)`)).toBe(name);
    }

    // Plural drift on the singular catalog name, and vice versa
    expect(resolveTriggerAbilityAlias("Torpedoes: Transport Warhead")).toBe(
      "Torpedo: Transport Warhead",
    );
    expect(resolveTriggerAbilityAlias("Torpedo: High Yield")).toBe(
      "Torpedoes: High Yield",
    );
    expect(resolveTriggerAbilityAlias("Torpedo: Nanite Repair Payload")).toBe(
      "Torpedoes: Nanite Repair Payload",
    );
  });

  it("returns null for blank or unrecognized labels", () => {
    expect(resolveTriggerAbilityAlias("")).toBeNull();
    expect(resolveTriggerAbilityAlias("Not A Real Ability")).toBeNull();
  });
});

describe("ability families", () => {
  it("exports the full EPtX family", () => {
    expect(abilitiesForFamily("eptx")).toEqual([...EPTX_ABILITIES]);
    expect(EPTX_ABILITIES).toContain("Emergency Power to Weapons");
    expect(EPTX_ABILITIES).toContain("Emergency Power to Shields");
    expect(EPTX_ABILITIES).toContain("Emergency Power to Engines");
    expect(EPTX_ABILITIES).toContain("Emergency Power to Auxiliary");
  });

  it("recognizes EPtX members via alias resolution", () => {
    expect(isAbilityInFamily("EPtW", "eptx")).toBe(true);
    expect(isAbilityInFamily("Emergency Power to Auxillary", "eptx")).toBe(
      false,
    );
    expect(isAbilityInFamily("Beams: Overload", "eptx")).toBe(false);
    expect(isAbilityInFamily("Beams: Overload", "firingMode")).toBe(true);
    expect(isAbilityInFamily("Tactical Team", "team")).toBe(true);
    expect(isAbilityInFamily("Attack Pattern Omega", "attackPattern")).toBe(
      true,
    );
  });
});

describe("functional categories", () => {
  it("lists curated anomaly abilities including the issue examples", () => {
    const anomaly = abilitiesForFunctionalCategory("anomaly");
    expect(anomaly).toEqual([...ANOMALY_ABILITIES]);
    for (const name of [
      "Gravity Well",
      "Tyken's Rift",
      "Tractor Beam Repulsors",
      "Photonic Shockwave",
      "Chronometric Inversion Field",
    ]) {
      expect(anomaly).toContain(name);
    }
  });

  it("matches Unconventional Systems Control abilities from the wiki", () => {
    const control = abilitiesForFunctionalCategory("control");
    expect(control).toEqual([...CONTROL_ABILITIES]);

    // Full set from https://stowiki.net/wiki/Unconventional_Systems_(space_trait)
    const unconventionalSystemsControl = [
      "Jam Targeting Sensors",
      "Tractor Beam",
      "Scramble Sensors",
      "Tractor Beam Repulsors",
      "Gravity Well",
      "Photonic Shockwave",
      "Emit Unstable Warp Bubble",
      "Eject Warp Plasma",
      "Viral Impulse Burst",
      "Electromagnetic Pulse Probe",
      "Ionic Turbulence",
      "Heisenberg Amplifier",
      "Chronometric Inversion Field",
      "Timeline Collapse",
      "Clean Getaway",
      "Null Pointer Flood",
      "Deploy Gravitic Induction Platform",
    ] as const;

    expect(control).toEqual([...unconventionalSystemsControl]);
    for (const name of unconventionalSystemsControl) {
      expect(isAbilityInFunctionalCategory(name, "control")).toBe(true);
    }

    // Not on the Unconventional Systems Control table
    expect(isAbilityInFunctionalCategory("Tyken's Rift", "control")).toBe(
      false,
    );
    expect(isAbilityInFunctionalCategory("Viral Matrix", "control")).toBe(
      false,
    );
  });

  it("resolves HTML-encoded Tyken's Rift into the anomaly category", () => {
    expect(
      isAbilityInFunctionalCategory("Tyken&#039;s Rift (ability)", "anomaly"),
    ).toBe(true);
    expect(isAbilityInFunctionalCategory("Gravity Well", "anomaly")).toBe(true);
    expect(isAbilityInFunctionalCategory("Gravity Well", "control")).toBe(true);
    expect(isAbilityInFunctionalCategory("Gravity Well", "exotic")).toBe(true);
    expect(isAbilityInFunctionalCategory("Evasive Maneuvers", "captainAbility")).toBe(
      true,
    );
  });

  it("keeps hangarPets as an empty list for seated-fill matching later", () => {
    expect(abilitiesForFunctionalCategory("hangarPets")).toEqual([]);
  });
});
