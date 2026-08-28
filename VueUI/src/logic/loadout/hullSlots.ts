import { itemFitsSlot, type HullSlotKind } from "./slotClass";
import { extraHullSlotSummary } from "./hullExtras";

/** One row on the in-game ship equipment panel (plus extras not on that panel). */
export type HullSlotGroup =
  | "foreWeapons"
  | "experimental"
  | "deflector"
  | "impulse"
  | "core"
  | "shields"
  | "aftWeapons"
  | "devices"
  | "universalConsoles"
  | "engineeringConsoles"
  | "scienceConsoles"
  | "tacticalConsoles"
  | "hangars"
  | "traits";

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
  tier?: number | null;
  boffs?: string | null;
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
 * Empty sockets for a hull, including T6-X/X2 and Commander Miracle Worker extras.
 * Unique ship consoles occupy a fillable console slot; they are not locked grants.
 */
export function buildHullSlots(ship: HullSlotSource): HullSlot[] {
  const extras = extraHullSlotSummary(ship);
  const extraConsoleSlots: HullSlot[] = [];
  const extraTraitSlots: HullSlot[] = [];
  let universalIndex = 0;
  let traitIndex = 0;
  for (const rule of extras.rules) {
    for (let i = 0; i < rule.universalConsoles; i += 1) {
      extraConsoleSlots.push({
        id: `universalConsole-${universalIndex}`,
        kind: "universalConsole",
        group: "universalConsoles",
        label: rule.consoleLabel,
        index: universalIndex,
      });
      universalIndex += 1;
    }
    for (let i = 0; i < rule.starshipTraits; i += 1) {
      extraTraitSlots.push({
        id: `starshipTrait-${traitIndex}`,
        kind: "starshipTrait",
        group: "traits",
        label: rule.traitLabel ?? `Starship Trait (${rule.detailLabel})`,
        index: traitIndex,
      });
      traitIndex += 1;
    }
  }

  return [
    ...numbered("foreWeapon", "foreWeapons", "Fore", count(ship.foreWeapons)),
    ...(ship.experimental
      ? [single("experimental", "experimental", "Experimental")]
      : []),
    single("deflector", "deflector", "Deflector"),
    ...(ship.secondaryDeflector
      ? [single("secondaryDeflector", "deflector", "Secondary Deflector")]
      : []),
    single("impulse", "impulse", "Impulse"),
    single("core", "core", "Warp / Singularity Core"),
    single("shields", "shields", "Shields"),
    ...numbered("aftWeapon", "aftWeapons", "Aft", count(ship.aftWeapons)),
    ...numbered("device", "devices", "Device", count(ship.devices)),
    ...extraConsoleSlots,
    ...numbered(
      "engineeringConsole",
      "engineeringConsoles",
      "Engineering",
      count(ship.engineeringSlots),
    ),
    ...numbered(
      "scienceConsole",
      "scienceConsoles",
      "Science",
      count(ship.scienceSlots),
    ),
    ...numbered(
      "tacticalConsole",
      "tacticalConsoles",
      "Tactical",
      count(ship.tacticalSlots),
    ),
    ...numbered("hangar", "hangars", "Hangar", count(ship.hangars)),
    ...extraTraitSlots,
  ];
}

const CONSOLE_KINDS: HullSlotKind[] = [
  "universalConsole",
  "tacticalConsole",
  "engineeringConsole",
  "scienceConsole",
];

/** First empty-capable console socket a granted unique console should occupy. */
export function slotForGrantedConsole(
  slots: readonly HullSlot[],
  itemType: string | null | undefined,
): HullSlot | null {
  const consoles = slots.filter((slot) => CONSOLE_KINDS.includes(slot.kind));
  const fitting = itemType
    ? consoles.filter((slot) => itemFitsSlot(itemType, slot.kind))
    : consoles;
  return (
    fitting.find((slot) => slot.kind === "universalConsole") ??
    fitting[0] ??
    null
  );
}

export const HULL_SLOT_GROUP_LABEL: Record<HullSlotGroup, string> = {
  foreWeapons: "Fore Weapons",
  experimental: "Experimental",
  deflector: "Deflector",
  impulse: "Impulse",
  core: "Warp",
  shields: "Shields",
  aftWeapons: "Aft Weapons",
  devices: "Devices",
  universalConsoles: "Universal Consoles",
  engineeringConsoles: "Engineering Consoles",
  scienceConsoles: "Science Consoles",
  tacticalConsoles: "Tactical Consoles",
  hangars: "Hangar",
  traits: "Starship Traits",
};

/** Same top-to-bottom order as the in-game ship equipment panel. */
export const HULL_SLOT_GROUP_ORDER: readonly HullSlotGroup[] = [
  "foreWeapons",
  "experimental",
  "deflector",
  "impulse",
  "core",
  "shields",
  "aftWeapons",
  "devices",
  "universalConsoles",
  "engineeringConsoles",
  "scienceConsoles",
  "tacticalConsoles",
  "hangars",
  "traits",
];

export function groupHullSlots(
  slots: readonly HullSlot[],
): Array<{ group: HullSlotGroup; label: string; slots: HullSlot[] }> {
  return HULL_SLOT_GROUP_ORDER.map((group) => ({
    group,
    label: HULL_SLOT_GROUP_LABEL[group],
    slots: slots.filter((slot) => slot.group === group),
  })).filter((section) => section.slots.length > 0);
}
