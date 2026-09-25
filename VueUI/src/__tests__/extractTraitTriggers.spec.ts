import { describe, expect, it } from "vitest";
import {
  extractLeadingTriggerClause,
  extractTraitTriggers,
  extractWikiLinkRefs,
  findProfessionKeywords,
  takeActivationSegment,
} from "@/logic/loadout/extractTraitTriggers";

describe("extractWikiLinkRefs", () => {
  it("returns empty for nullish or blank input", () => {
    expect(extractWikiLinkRefs(null)).toEqual([]);
    expect(extractWikiLinkRefs(undefined)).toEqual([]);
    expect(extractWikiLinkRefs("   ")).toEqual([]);
  });

  it("parses piped and plain wiki links, skipping File tokens", () => {
    const refs = extractWikiLinkRefs(
      "[[Ability: Beams: Fire at Will|Fire at Will]] and [[File:Faction Federation.png|16px]] [[Emergency Power to Weapons]]",
    );
    expect(refs.map((r) => r.label)).toEqual([
      "Fire at Will",
      "Emergency Power to Weapons",
    ]);
    expect(refs[0]?.page).toBe("Ability: Beams: Fire at Will");
  });
});

describe("takeActivationSegment", () => {
  it("keeps text before will/grant effect verbs", () => {
    const basic =
      "* While slotted, activating any [[Temporal Operative]] Bridge Officer Ability or the [[Directed Energy Modulation (ability)|Directed Energy Modulation]] Ability will grant +25% Bonus Damage of [[Cannons: Rapid Fire (ability)|Cannons: Rapid Fire]]";
    const segment = takeActivationSegment(basic);
    expect(segment).toContain("Temporal Operative");
    expect(segment).toContain("Directed Energy Modulation");
    expect(segment).not.toContain("Cannons: Rapid Fire");
  });
});

describe("findProfessionKeywords", () => {
  it("matches tray-skill type vocabulary with aliases", () => {
    expect(
      findProfessionKeywords("Science or Intelligence Bridge Officer ability"),
    ).toEqual(["Science", "Intelligence"]);
    expect(findProfessionKeywords("Temp Op BOff Abilities")).toEqual([
      "Temporal Operative",
    ]);
    expect(findProfessionKeywords("Tactical or Command")).toEqual([
      "Tactical",
      "Command",
    ]);
  });
});

describe("extractLeadingTriggerClause", () => {
  it("reads the On/When/While clause from short text", () => {
    expect(
      extractLeadingTriggerClause({
        short:
          "On Emergency Power to Weapons: -Weapon Power Cost, +Weapon Firing Speed.",
      }),
    ).toBe("On Emergency Power to Weapons");
  });

  it("returns null when no leading clause exists", () => {
    expect(
      extractLeadingTriggerClause({
        short: "Additional Broadside Beams during Beam Modes",
      }),
    ).toBeNull();
  });
});

describe("extractTraitTriggers — acceptance cases", () => {
  it("Emergency Weapon Cycle → named ability Emergency Power to Weapons", () => {
    const triggers = extractTraitTriggers({
      name: "Emergency Weapon Cycle",
      short:
        "On Emergency Power to Weapons: -Weapon Power Cost, +Weapon Firing Speed.",
      basic:
        "* Upon activating [[Emergency Power to Weapons]], you gain a reduction in weapon power cost and a bonus to weapon firing speed for the duration of the Emergency Power.",
      detailed:
        "* On Emergency Power to Weapons:\n** -50% Weapon Power Cost for 30 sec",
    });

    expect(triggers).toEqual([
      {
        kind: "namedAbility",
        abilityName: "Emergency Power to Weapons",
        display: "Emergency Power to Weapons",
      },
    ]);
  });

  it("Spore-Infused Anomalies → profession category Science + Intelligence", () => {
    const triggers = extractTraitTriggers({
      name: "Spore-Infused Anomalies",
      short: "Science and Intel abilities cause your anomalies to deal damage",
      basic:
        "* While this trait is slotted, Science or Intelligence Bridge Officer ability will cause your Bridge Officer summoned anomalies to deal electrical damage and drain the power levels of all foes nearby.",
      detailed:
        "Whenever you activate a Science or Intelligence Bridge Officer Ability:\n*To foes within 5km of your anomalies:",
    });

    expect(triggers).toHaveLength(1);
    expect(triggers[0]).toEqual({
      kind: "professionCategory",
      professions: ["Science", "Intelligence"],
      display: "Science or Intelligence",
    });
  });

  it("combat-state trait → combatState with display text only", () => {
    const triggers = extractTraitTriggers({
      name: "Punch It!",
      short:
        "When below 50% Hull Strength: Cleanse Crowd Control, Gain Increased Defense and Mobility for a brief period, and knock nearby enemy Subsystems Offline.",
      basic:
        "* When you suffer damage below 50% Hull Strength, an emergency response is triggered. Nearby enemy combatants within 5km will have their Engines and Weapons knocked offline.",
      detailed:
        "* When taking damage at 50% or less hull strength ''(once every 60 sec)'':\n** Cleanse any current Control Debuffs",
    });

    expect(triggers).toEqual([
      {
        kind: "combatState",
        display: "When below 50% Hull Strength",
      },
    ]);
  });

  it("is deterministic and safe on missing/empty fields", () => {
    expect(extractTraitTriggers(null)).toEqual([]);
    expect(extractTraitTriggers(undefined)).toEqual([]);
    expect(extractTraitTriggers({})).toEqual([]);
    expect(
      extractTraitTriggers({ name: "Empty", short: "", basic: null }),
    ).toEqual([]);

    const a = extractTraitTriggers({
      short: "On Emergency Power to Weapons: haste",
      basic: "* Upon activating [[Emergency Power to Weapons]], you gain haste.",
    });
    const b = extractTraitTriggers({
      short: "On Emergency Power to Weapons: haste",
      basic: "* Upon activating [[Emergency Power to Weapons]], you gain haste.",
    });
    expect(a).toEqual(b);
  });
});

describe("extractTraitTriggers — readiness examples", () => {
  it("All Hands on Deck → Tactical or Command (not Science/Captain effect targets)", () => {
    const triggers = extractTraitTriggers({
      name: "All Hands on Deck",
      short: "-Recharge on Science and Captain abilities.",
      basic:
        "* Activating a [[Bridge officer and kit abilities#Tactical Abilities|Tactical]] or [[Command Bridge Officer Ability|Command]] Bridge Officer ability will reduce the recharge time of  [[Bridge officer and kit abilities#Science Abilities|Science]] Bridge Officer abilities and [[Player ability|Captain]] abilities. This may only occur once every few seconds.",
      detailed:
        "When activating a Tactical or Command Bridge Officer ability:\n* Self: -10% Recharge Time on Science Bridge Officer abilities.\n* Self: -5% Recharge Time on Captain Abilities.",
    });

    expect(triggers).toEqual([
      {
        kind: "professionCategory",
        professions: ["Tactical", "Command"],
        display: "Tactical or Command",
      },
    ]);
  });

  it("Broadside Beam Support → FAW or Beams: Overload", () => {
    const triggers = extractTraitTriggers({
      name: "Broadside Beam Support",
      short: "Additional Broadside Beams during Beam Modes",
      basic:
        "* When you activate a either [[Ability: Beams: Fire at Will|Fire at Will]] or [[Ability: Beams: Overload|Beam Overload]] firing a Beam weapon will fire an additional phaser beam per firing cycle per weapon.",
      detailed:
        "During FAW or Beam Overload to a random target within 5km on your left and right broadside:\n* ___ Phaser Damage per weapon firing activation per weapon.",
    });

    expect(triggers.map((t) => ("abilityName" in t ? t.abilityName : t.kind))).toEqual(
      ["Beams: Fire at Will", "Beams: Overload"],
    );
    expect(triggers.every((t) => t.kind === "namedAbility")).toBe(true);
  });

  it("Directed Energy Flux → Temporal Operative or Directed Energy Modulation", () => {
    const triggers = extractTraitTriggers({
      name: "Directed Energy Flux",
      short:
        "Dmg Buff to Rapid Fire and Beam Overload from Temp Op BOff Abilities and Directed Energy Modulation.",
      basic:
        "* While slotted, activating any [[Temporal Operative]] Bridge Officer Ability or the [[Directed Energy Modulation (ability)|Directed Energy Modulation]] Ability will grant +25% Bonus Damage of [[Cannons: Rapid Fire (ability)|Cannons: Rapid Fire]] and [[Beams: Overload (ability)|Beams: Overload]] for 15 sec.",
      detailed:
        "* Directed Energy Modulation or a Temporal Operative BOff Ability grant:\n** Beam: Overload and Cannon: Rapid Fire gain 25% Bonus Damage for 15 sec",
    });

    expect(triggers).toEqual([
      {
        kind: "namedAbility",
        abilityName: "Directed Energy Modulation",
        display: "Directed Energy Modulation",
      },
      {
        kind: "professionCategory",
        professions: ["Temporal Operative"],
        display: "Temporal Operative",
      },
    ]);
    // Buffed firing modes must not appear as activation triggers
    expect(
      triggers.some(
        (t) =>
          t.kind === "namedAbility" &&
          (t.abilityName === "Beams: Overload" ||
            t.abilityName === "Cannons: Rapid Fire"),
      ),
    ).toBe(false);
  });

  it("Checkmate → control functional category", () => {
    const triggers = extractTraitTriggers({
      name: "Checkmate",
      short:
        "Exotic Damage and Projectile Damage Enhanced by Control Bridge Officer Abilities.",
      basic:
        "* While this trait is slotted, activating a control Bridge Officer ability will provide a boost to your Exotic Damage and Projectile Weapon damage for a short time.",
      detailed:
        "When activating a control Bridge Officer Ability:\n* +30% Exotic Damage for 15 sec",
    });

    expect(triggers).toEqual([
      {
        kind: "functionalCategory",
        category: "control",
        display: "Control",
      },
    ]);
  });
});
