/** Equipment classes an infobox can occupy. */
export type ItemSlotClass =
  | "foreWeapon"
  | "aftWeapon"
  | "experimental"
  | "tacticalConsole"
  | "engineeringConsole"
  | "scienceConsole"
  | "universalConsole"
  | "deflector"
  | "secondaryDeflector"
  | "impulse"
  | "warpCore"
  | "singularityCore"
  | "shields"
  | "vanityShield"
  | "device"
  | "hangar";

/** Empty hull sockets the builder creates from ship stats. */
export type HullSlotKind =
  | "foreWeapon"
  | "aftWeapon"
  | "experimental"
  | "tacticalConsole"
  | "engineeringConsole"
  | "scienceConsole"
  | "deflector"
  | "secondaryDeflector"
  | "impulse"
  | "core"
  | "shields"
  | "device"
  | "hangar";

const INFOBOX_TYPE_TO_CLASSES: Record<string, readonly ItemSlotClass[]> = {
  "ship fore weapon": ["foreWeapon"],
  "ship aft weapon": ["aftWeapon"],
  "ship weapon": ["foreWeapon", "aftWeapon"],
  "experimental weapon": ["experimental"],
  "ship tactical console": ["tacticalConsole"],
  "ship engineering console": ["engineeringConsole"],
  "ship science console": ["scienceConsole"],
  "universal console": ["universalConsole"],
  "ship deflector dish": ["deflector"],
  "ship secondary deflector": ["secondaryDeflector"],
  "impulse engine": ["impulse"],
  "warp engine": ["warpCore"],
  "singularity engine": ["singularityCore"],
  "ship shields": ["shields"],
  "ship vanity shield": ["vanityShield"],
  "ship vanity shields": ["vanityShield"],
  "ship device": ["device"],
  "hangar bay": ["hangar"],
};

const SLOT_ACCEPTS: Record<HullSlotKind, readonly ItemSlotClass[]> = {
  foreWeapon: ["foreWeapon"],
  aftWeapon: ["aftWeapon"],
  experimental: ["experimental"],
  tacticalConsole: ["tacticalConsole", "universalConsole"],
  engineeringConsole: ["engineeringConsole", "universalConsole"],
  scienceConsole: ["scienceConsole", "universalConsole"],
  deflector: ["deflector"],
  secondaryDeflector: ["secondaryDeflector"],
  impulse: ["impulse"],
  core: ["warpCore", "singularityCore"],
  shields: ["shields", "vanityShield"],
  device: ["device"],
  hangar: ["hangar"],
};

export function itemSlotClassesFromType(
  type: string | null | undefined,
): ItemSlotClass[] {
  if (!type?.trim()) return [];
  const classes = new Set<ItemSlotClass>();
  for (const part of type.split(",")) {
    const mapped = INFOBOX_TYPE_TO_CLASSES[part.trim().toLowerCase()];
    if (!mapped) continue;
    for (const slotClass of mapped) classes.add(slotClass);
  }
  return [...classes];
}

export function itemFitsSlot(
  type: string | null | undefined,
  slotKind: HullSlotKind,
): boolean {
  const itemClasses = itemSlotClassesFromType(type);
  if (itemClasses.length === 0) return false;
  const accepted = SLOT_ACCEPTS[slotKind];
  return itemClasses.some((slotClass) => accepted.includes(slotClass));
}

export function isSpaceEquipmentType(type: string | null | undefined): boolean {
  return itemSlotClassesFromType(type).length > 0;
}
