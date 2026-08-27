import type { HullSlotKind } from "./slotClass";

export type HullSlotGroup =
  | "weapons"
  | "consoles"
  | "systems"
  | "devices"
  | "hangars";

export type HullSlot = {
  id: string;
  kind: HullSlotKind;
  group: HullSlotGroup;
  label: string;
  index: number;
};

export type HullSlotSource = {
  foreWeapons?: number | null;
  aftWeapons?: number | null;
  experimental?: boolean | null;
  tacticalSlots?: number | null;
  engineeringSlots?: number | null;
  scienceSlots?: number | null;
  secondaryDeflector?: boolean | null;
  devices?: number | null;
  hangars?: number | null;
};

function count(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function numbered(
  kind: HullSlotKind,
  group: HullSlotGroup,
  label: string,
  total: number,
): HullSlot[] {
  return Array.from({ length: total }, (_, index) => ({
    id: `${kind}-${index}`,
    kind,
    group,
    label: total === 1 ? label : `${label} ${index + 1}`,
    index,
  }));
}

function single(
  kind: HullSlotKind,
  group: HullSlotGroup,
  label: string,
): HullSlot {
  return { id: kind, kind, group, label, index: 0 };
}

/**
 * Empty sockets for a hull. Unique ship consoles are grants, not fillable slots.
 * Deflector / impulse / core / shields are always present on a space loadout.
 */
export function buildHullSlots(ship: HullSlotSource): HullSlot[] {
  return [
    ...numbered("foreWeapon", "weapons", "Fore", count(ship.foreWeapons)),
    ...numbered("aftWeapon", "weapons", "Aft", count(ship.aftWeapons)),
    ...(ship.experimental ? [single("experimental", "weapons", "Experimental")] : []),
    ...numbered(
      "tacticalConsole",
      "consoles",
      "Tactical",
      count(ship.tacticalSlots),
    ),
    ...numbered(
      "engineeringConsole",
      "consoles",
      "Engineering",
      count(ship.engineeringSlots),
    ),
    ...numbered(
      "scienceConsole",
      "consoles",
      "Science",
      count(ship.scienceSlots),
    ),
    single("deflector", "systems", "Deflector"),
    ...(ship.secondaryDeflector
      ? [single("secondaryDeflector", "systems", "Secondary Deflector")]
      : []),
    single("impulse", "systems", "Impulse"),
    single("core", "systems", "Warp / Singularity Core"),
    single("shields", "systems", "Shields"),
    ...numbered("device", "devices", "Device", count(ship.devices)),
    ...numbered("hangar", "hangars", "Hangar", count(ship.hangars)),
  ];
}

export const HULL_SLOT_GROUP_LABEL: Record<HullSlotGroup, string> = {
  weapons: "Weapons",
  consoles: "Consoles",
  systems: "Systems",
  devices: "Devices",
  hangars: "Hangars",
};

export function groupHullSlots(
  slots: readonly HullSlot[],
): Array<{ group: HullSlotGroup; label: string; slots: HullSlot[] }> {
  const order: HullSlotGroup[] = [
    "weapons",
    "consoles",
    "systems",
    "devices",
    "hangars",
  ];
  return order
    .map((group) => ({
      group,
      label: HULL_SLOT_GROUP_LABEL[group],
      slots: slots.filter((slot) => slot.group === group),
    }))
    .filter((section) => section.slots.length > 0);
}
