export type LabelDensity = "comfortable" | "compact" | "dense";

export type ShipDetailLabels = {
  combatTitle: string;
  acquisitionTitle: string;
  speedHeader: string;
  powerHeader: string;
  turnRate: string;
  inertia: string;
  impulse: string;
  weapons: string;
  shields: string;
  engines: string;
  auxiliary: string;
  level: string;
  releaseDate: string;
  bridgeTitle: string;
  weaponsTitle: string;
  equipmentTitle: string;
  traitsTitle: string;
  admiraltyTitle: string;
  consolesHeader: string;
  universalConsoles: string;
  emptyTraitSlots: string;
  foreWeapons: string;
  aftWeapons: string;
  typeSpecificSlot: string;
  canEquipCannons: string;
  deviceSlots: string;
  hangars: string;
  secondaryDeflector: string;
  engineering: string;
  tactical: string;
  science: string;
};

const LABEL_SETS: Record<LabelDensity, ShipDetailLabels> = {
  comfortable: {
    combatTitle: "Combat Statistics",
    acquisitionTitle: "Acquisition",
    speedHeader: "Speed",
    powerHeader: "Power",
    turnRate: "Turn Rate",
    inertia: "Inertia",
    impulse: "Impulse",
    weapons: "Wpn",
    shields: "Shd",
    engines: "Eng",
    auxiliary: "Aux",
    level: "Available at Level",
    releaseDate: "Release Date",
    bridgeTitle: "BOffs & Consoles",
    weaponsTitle: "Equipment Slots",
    equipmentTitle: "Accessories",
    traitsTitle: "Starship Traits",
    admiraltyTitle: "Admiralty",
    consolesHeader: "Consoles",
    universalConsoles: "Uni",
    emptyTraitSlots: "Trait slots",
    foreWeapons: "Fore",
    aftWeapons: "Aft",
    typeSpecificSlot: "Spec Slot",
    canEquipCannons: "Cannons",
    deviceSlots: "Devices",
    hangars: "Hangars",
    secondaryDeflector: "2nd Deflector",
    engineering: "Eng",
    tactical: "Tac",
    science: "Sci",
  },
  compact: {
    combatTitle: "Combat",
    acquisitionTitle: "Acquisition",
    speedHeader: "Speed",
    powerHeader: "Power",
    turnRate: "Turn",
    inertia: "Inert",
    impulse: "Imp",
    weapons: "W",
    shields: "S",
    engines: "E",
    auxiliary: "A",
    level: "Level",
    releaseDate: "Released",
    bridgeTitle: "BOffs",
    weaponsTitle: "Eq. Slots",
    equipmentTitle: "Accessories",
    traitsTitle: "Traits",
    admiraltyTitle: "Admiralty",
    consolesHeader: "Consoles",
    universalConsoles: "Uni",
    emptyTraitSlots: "Trait slots",
    foreWeapons: "Fore",
    aftWeapons: "Aft",
    typeSpecificSlot: "Spec",
    canEquipCannons: "Cannons",
    deviceSlots: "Devices",
    hangars: "Hangars",
    secondaryDeflector: "2nd Def",
    engineering: "Eng",
    tactical: "Tac",
    science: "Sci",
  },
  dense: {
    combatTitle: "Combat",
    acquisitionTitle: "Acquire",
    speedHeader: "Spd",
    powerHeader: "Pwr",
    turnRate: "TR",
    inertia: "In",
    impulse: "Imp",
    weapons: "W",
    shields: "S",
    engines: "E",
    auxiliary: "A",
    level: "Lvl",
    releaseDate: "Rel",
    bridgeTitle: "BOffs",
    weaponsTitle: "Slots",
    equipmentTitle: "Acc",
    traitsTitle: "Traits",
    admiraltyTitle: "Adm",
    consolesHeader: "Consoles",
    universalConsoles: "U",
    emptyTraitSlots: "Trait",
    foreWeapons: "F",
    aftWeapons: "A",
    typeSpecificSlot: "Spec",
    canEquipCannons: "Can",
    deviceSlots: "Dev",
    hangars: "Hgr",
    secondaryDeflector: "2D",
    engineering: "E",
    tactical: "T",
    science: "S",
  },
};

/** Full tooltip / accessible names for abbreviated UI labels. */
export const SHIP_DETAIL_FULL_LABELS = {
  combatTitle: "Combat Statistics",
  acquisitionTitle: "Acquisition",
  turnRate: "Turn Rate",
  inertia: "Inertia",
  impulse: "Impulse",
  weapons: "Weapons",
  shields: "Shields",
  engines: "Engines",
  auxiliary: "Auxiliary",
  level: "Available at Level",
  releaseDate: "Release Date",
  bridgeTitle: "Bridge Officers and Consoles",
  weaponsTitle: "Equipment Slots",
  equipmentTitle: "Accessories",
  traitsTitle: "Starship Traits",
  admiraltyTitle: "Admiralty",
  universalConsoles: "Universal Console Slots",
  emptyTraitSlots: "Starship Trait Slots",
  foreWeapons: "Fore Weapons",
  aftWeapons: "Aft Weapons",
  typeSpecificSlot: "Type-Specific Slot",
  canEquipCannons: "Can Equip Cannons",
  deviceSlots: "Device Slots",
  hangars: "Hangars",
  secondaryDeflector: "Secondary Deflector",
  engineering: "Engineering",
  tactical: "Tactical",
  science: "Science",
} as const;

/**
 * Map viewport width to label density.
 * Narrow cards at 1920 still need abbreviated titles, so "comfortable"
 * already shortens constrained card/stat labels.
 */
export function densityFromWidth(width: number): LabelDensity {
  if (!Number.isFinite(width) || width <= 0) return "compact";
  if (width < 1280) return "dense";
  if (width < 1600) return "compact";
  return "comfortable";
}

export function getShipDetailLabels(density: LabelDensity): ShipDetailLabels {
  return LABEL_SETS[density];
}
