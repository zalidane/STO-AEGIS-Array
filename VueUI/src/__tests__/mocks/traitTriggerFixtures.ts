/**
 * Shared fixtures for trait-trigger cross-ref tests (#32).
 * Reuse / extend here instead of redefining catalog rows per test.
 */
import { BOFF_CATALOG_KIND } from "@/logic/loadout/boffPowers";
import type { SeatedTriggerFill } from "@/logic/loadout/crossRefTraitTriggers";
import type { LoadoutItem, LoadoutSlotFill } from "@/logic/loadout/types";
import type { HullSlotKind } from "@/logic/loadout/slotClass";

export const MOCK_TRAY_SKILLS = {
  eptw: {
    id: 101,
    name: "Emergency Power to Weapons",
    type: "Engineering",
    catalogKind: BOFF_CATALOG_KIND,
  },
  epts: {
    id: 102,
    name: "Emergency Power to Shields",
    type: "Engineering",
    catalogKind: BOFF_CATALOG_KIND,
  },
  gravityWell: {
    id: 201,
    name: "Gravity Well",
    type: "Science",
    catalogKind: BOFF_CATALOG_KIND,
  },
  viralImpulse: {
    id: 202,
    name: "Viral Impulse Burst",
    type: "Intelligence",
    catalogKind: BOFF_CATALOG_KIND,
  },
  tacticalTeam: {
    id: 301,
    name: "Tactical Team",
    type: "Tactical",
    catalogKind: BOFF_CATALOG_KIND,
  },
  concentrateFirepower: {
    id: 302,
    name: "Concentrate Firepower",
    type: "Command",
    catalogKind: BOFF_CATALOG_KIND,
  },
  faw: {
    id: 401,
    name: "Beams: Fire at Will",
    type: "Tactical",
    catalogKind: BOFF_CATALOG_KIND,
  },
  beamOverload: {
    id: 402,
    name: "Beams: Overload",
    type: "Tactical",
    catalogKind: BOFF_CATALOG_KIND,
  },
  dem: {
    id: 501,
    name: "Directed Energy Modulation",
    type: "Engineering",
    catalogKind: BOFF_CATALOG_KIND,
  },
  recursiveShearing: {
    id: 502,
    name: "Recursive Shearing",
    type: "Temporal Operative",
    catalogKind: BOFF_CATALOG_KIND,
  },
  jamSensors: {
    id: 601,
    name: "Jam Targeting Sensors",
    type: "Science",
    catalogKind: BOFF_CATALOG_KIND,
  },
  scienceTeam: {
    id: 701,
    name: "Science Team",
    type: "Science",
    catalogKind: BOFF_CATALOG_KIND,
  },
} as const satisfies Record<string, LoadoutItem>;

export const MOCK_HANGAR_PETS = {
  tods: {
    id: 9001,
    name: "Hangar - Advanced Torpedo Turret",
    type: "Hangar Bay",
    catalogKind: "item" as const,
  },
  fighters: {
    id: 9002,
    name: "Hangar - Peregrine Fighters",
    type: "Hangar Bay",
    catalogKind: "item" as const,
  },
} as const satisfies Record<string, LoadoutItem>;

export const MOCK_CAPTAIN_POWERS = {
  evasive: { id: 8001, name: "Evasive Maneuvers" },
  apa: { id: 8002, name: "Attack Pattern Alpha" },
} as const;

export const MOCK_HULL_SLOTS: ReadonlyArray<{
  id: string;
  kind: HullSlotKind;
}> = [
  { id: "foreWeapon-0", kind: "foreWeapon" },
  { id: "hangar-0", kind: "hangar" },
  { id: "hangar-1", kind: "hangar" },
];

export const MOCK_WEAPONS = {
  phaserBeamArray: {
    id: 7001,
    name: "Phaser Beam Array",
    type: "ship fore weapon",
    catalogKind: "item" as const,
  },
  dualCannons: {
    id: 7002,
    name: "Phaser Dual Cannons",
    type: "ship fore weapon",
    catalogKind: "item" as const,
  },
  quantumTorpedo: {
    id: 7003,
    name: "Quantum Torpedo Launcher",
    type: "ship fore weapon",
    catalogKind: "item" as const,
  },
} as const satisfies Record<string, LoadoutItem>;

export function mockCatalog(
  ...items: LoadoutItem[]
): LoadoutItem[] {
  return items;
}

export function mockTrayFill(
  skill: LoadoutItem,
  slotId = "boff-0-ensign",
): LoadoutSlotFill {
  return {
    slotId,
    itemId: skill.id,
    catalogKind: BOFF_CATALOG_KIND,
  };
}

export function mockHangarFill(
  pet: LoadoutItem,
  slotId = "hangar-0",
): LoadoutSlotFill {
  return {
    slotId,
    itemId: pet.id,
    catalogKind: "item",
  };
}

export function mockWeaponFill(
  weapon: LoadoutItem,
  slotId = "foreWeapon-0",
): LoadoutSlotFill {
  return {
    slotId,
    itemId: weapon.id,
    catalogKind: "item",
  };
}

export function mockSeatedTray(
  skill: LoadoutItem,
  slotId = "boff-0-ensign",
): SeatedTriggerFill {
  return {
    itemId: skill.id,
    name: skill.name,
    catalogKind: BOFF_CATALOG_KIND,
    type: skill.type,
    slotId,
    slotKind: "boff",
  };
}

export function mockSeatedHangar(
  pet: LoadoutItem,
  slotId = "hangar-0",
): SeatedTriggerFill {
  return {
    itemId: pet.id,
    name: pet.name,
    catalogKind: "item",
    type: pet.type,
    slotId,
    slotKind: "hangar",
  };
}

export function mockSeatedWeapon(
  weapon: LoadoutItem,
  slotId = "foreWeapon-0",
): SeatedTriggerFill {
  return {
    itemId: weapon.id,
    name: weapon.name,
    catalogKind: "item",
    type: weapon.type,
    slotId,
    slotKind: "foreWeapon",
  };
}

export function mockSeatedCaptain(power: {
  id: number;
  name: string;
}): SeatedTriggerFill {
  return {
    itemId: power.id,
    name: power.name,
    catalogKind: "captainAbility",
    slotKind: "captain",
  };
}

/** Cargo-shaped text sources for readiness / acceptance traits. */
export const MOCK_TRAIT_SOURCES = {
  emergencyWeaponCycle: {
    name: "Emergency Weapon Cycle",
    short:
      "On Emergency Power to Weapons: -Weapon Power Cost, +Weapon Firing Speed.",
    basic:
      "* Upon activating [[Emergency Power to Weapons]], you gain a reduction in weapon power cost and a bonus to weapon firing speed for the duration of the Emergency Power.",
    detailed:
      "* On Emergency Power to Weapons:\n** -50% Weapon Power Cost for 30 sec",
  },
  sporeInfusedAnomalies: {
    name: "Spore-Infused Anomalies",
    short: "Science and Intel abilities cause your anomalies to deal damage",
    basic:
      "* While this trait is slotted, Science or Intelligence Bridge Officer ability will cause your Bridge Officer summoned anomalies to deal electrical damage and drain the power levels of all foes nearby.",
    detailed:
      "Whenever you activate a Science or Intelligence Bridge Officer Ability:\n*To foes within 5km of your anomalies:",
  },
  allHandsOnDeck: {
    name: "All Hands on Deck",
    short: "-Recharge on Science and Captain abilities.",
    basic:
      "* Activating a [[Bridge officer and kit abilities#Tactical Abilities|Tactical]] or [[Command Bridge Officer Ability|Command]] Bridge Officer ability will reduce the recharge time of  [[Bridge officer and kit abilities#Science Abilities|Science]] Bridge Officer abilities and [[Player ability|Captain]] abilities. This may only occur once every few seconds.",
    detailed:
      "When activating a Tactical or Command Bridge Officer ability:\n* Self: -10% Recharge Time on Science Bridge Officer abilities.\n* Self: -5% Recharge Time on Captain Abilities.",
  },
  broadsideBeamSupport: {
    name: "Broadside Beam Support",
    short: "Additional Broadside Beams during Beam Modes",
    basic:
      "* When you activate a either [[Ability: Beams: Fire at Will|Fire at Will]] or [[Ability: Beams: Overload|Beam Overload]] firing a Beam weapon will fire an additional phaser beam per firing cycle per weapon.",
    detailed:
      "During FAW or Beam Overload to a random target within 5km on your left and right broadside:\n* ___ Phaser Damage per weapon firing activation per weapon.",
  },
  directedEnergyFlux: {
    name: "Directed Energy Flux",
    short:
      "Dmg Buff to Rapid Fire and Beam Overload from Temp Op BOff Abilities and Directed Energy Modulation.",
    basic:
      "* While slotted, activating any [[Temporal Operative]] Bridge Officer Ability or the [[Directed Energy Modulation (ability)|Directed Energy Modulation]] Ability will grant +25% Bonus Damage of [[Cannons: Rapid Fire (ability)|Cannons: Rapid Fire]] and [[Beams: Overload (ability)|Beams: Overload]] for 15 sec.",
    detailed:
      "* Directed Energy Modulation or a Temporal Operative BOff Ability grant:\n** Beam: Overload and Cannon: Rapid Fire gain 25% Bonus Damage for 15 sec",
  },
  punchIt: {
    name: "Punch It!",
    short:
      "When below 50% Hull Strength: Cleanse Crowd Control, Gain Increased Defense and Mobility for a brief period, and knock nearby enemy Subsystems Offline.",
    basic:
      "* When you suffer damage below 50% Hull Strength, an emergency response is triggered. Nearby enemy combatants within 5km will have their Engines and Weapons knocked offline.",
    detailed:
      "* When taking damage at 50% or less hull strength ''(once every 60 sec)'':\n** Cleanse any current Control Debuffs",
  },
  beamBarrage: {
    name: "Beam Barrage",
    short: "Gain Beam Damage when activating Beam skills",
    basic: "Gain Beam Damage when activating Beam skills",
    detailed: null,
  },
  unconventionalSystems: {
    name: "Unconventional Systems",
    // Cargo often leaves these blank — extraction fills via name override.
    short: null,
    basic: null,
    detailed: null,
  },
  boimlerEffect: {
    name: "The Boimler Effect",
    short:
      "Chance for Bridge Officer Abilities to reset all Bridge Officer Abilities",
    basic:
      "Provides a chance for using Bridge Officer Abilities to recharge all other Bridge Officer Ability recharge times up to their respective Shared Cooldown Categories.",
    detailed: null,
  },
  checkmate: {
    name: "Checkmate",
    short:
      "Exotic Damage and Projectile Damage Enhanced by Control Bridge Officer Abilities.",
    basic:
      "* While this trait is slotted, activating a control Bridge Officer ability will provide a boost to your Exotic Damage and Projectile Weapon damage for a short time.",
    detailed:
      "When activating a control Bridge Officer Ability:\n* +30% Exotic Damage for 15 sec",
  },
} as const;
