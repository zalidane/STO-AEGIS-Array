import {
  careerTraitCode,
  hasExtraPersonalTraitSlot,
  type CaptainCareer,
} from "@/logic/captain/identity";
import { EXTRA_PERSONAL_TRAIT_UNLOCK } from "@/logic/captain/upgrade";

export type CaptainTraitGroup =
  | "personalSpace"
  | "starship"
  | "shipSpecific"
  | "spaceReputation"
  | "activeSpaceReputation";

export type CaptainTraitStorage = "character" | "loadout";

export type CaptainTraitCatalogKind = "trait" | "starshipTrait";

export type CaptainTraitSlot = {
  id: string;
  group: CaptainTraitGroup;
  label: string;
  index: number;
  catalogKind: CaptainTraitCatalogKind;
  storage: CaptainTraitStorage;
  locked?: boolean;
};

export type CaptainTraitFill = {
  slotId: string;
  itemId: number;
  catalogKind: CaptainTraitCatalogKind;
};

export type CaptainTraitSource = {
  id: number;
  name: string;
  type: string | null;
  environment: string | null;
  career?: string | null;
  required?: string | null;
  catalogKind?: CaptainTraitCatalogKind;
  image?: string | null;
};

export const PERSONAL_SPACE_BASE_SLOTS = 9;
export const PERSONAL_GROUND_BASE_SLOTS = 9;
export const STARSHIP_BASE_SLOTS = 4;
export const REPUTATION_BASE_SLOTS = 4;
export const ACTIVE_REPUTATION_BASE_SLOTS = 4;

/** Endgame unlocks; every socket on the board starts open. */
export const EXTRA_STARSHIP_TRAIT_UNLOCK = 1;
export const EXTRA_REPUTATION_TRAIT_UNLOCK = 1;
export const EXTRA_ACTIVE_REPUTATION_TRAIT_UNLOCK = 1;
/** Empty ship-trait sockets on every hull; innate traits are not auto-seated. */
export const SHIP_SPECIFIC_SLOTS = 2;

export const CAPTAIN_STARSHIP_SLOTS =
  STARSHIP_BASE_SLOTS + EXTRA_STARSHIP_TRAIT_UNLOCK;
export const CAPTAIN_REPUTATION_SLOTS =
  REPUTATION_BASE_SLOTS + EXTRA_REPUTATION_TRAIT_UNLOCK;
export const CAPTAIN_ACTIVE_REPUTATION_SLOTS =
  ACTIVE_REPUTATION_BASE_SLOTS + EXTRA_ACTIVE_REPUTATION_TRAIT_UNLOCK;

export const CAPTAIN_TRAIT_GROUP_LABEL: Record<CaptainTraitGroup, string> = {
  personalSpace: "Personal Space Traits",
  starship: "Starship Traits",
  shipSpecific: "Ship Traits",
  spaceReputation: "Space Reputation",
  activeSpaceReputation: "Active Space Reputation",
};

export const CAPTAIN_TRAIT_GROUP_ORDER: readonly CaptainTraitGroup[] = [
  "personalSpace",
  "starship",
  "shipSpecific",
  "spaceReputation",
  "activeSpaceReputation",
];

function numbered(
  group: CaptainTraitGroup,
  catalogKind: CaptainTraitCatalogKind,
  storage: CaptainTraitStorage,
  count: number,
  idPrefix: string,
): CaptainTraitSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${idPrefix}-${index}`,
    group,
    label: CAPTAIN_TRAIT_GROUP_LABEL[group],
    index,
    catalogKind,
    storage,
  }));
}

export function personalTraitSlotCount(
  factionId: string | null | undefined,
  raceId: string | null | undefined,
): number {
  return (
    PERSONAL_SPACE_BASE_SLOTS +
    EXTRA_PERSONAL_TRAIT_UNLOCK +
    (hasExtraPersonalTraitSlot(factionId, raceId) ? 1 : 0)
  );
}

export function personalSpaceSlotCount(
  factionId: string | null | undefined,
  raceId: string | null | undefined,
): number {
  return personalTraitSlotCount(factionId, raceId);
}

export function personalGroundSlotCount(
  factionId: string | null | undefined,
  raceId: string | null | undefined,
): number {
  return (
    PERSONAL_GROUND_BASE_SLOTS +
    EXTRA_PERSONAL_TRAIT_UNLOCK +
    (hasExtraPersonalTraitSlot(factionId, raceId) ? 1 : 0)
  );
}

export function shipSpecificSectionLabel(shipName: string | null | undefined): string {
  const name = shipName?.trim();
  return name ? `${name} Traits` : CAPTAIN_TRAIT_GROUP_LABEL.shipSpecific;
}

/**
 * Empty sockets on the captain space-traits board.
 * Captain starship fills live on the character; ship-specific fills live on the loadout.
 */
export function buildCaptainTraitSlots(input: {
  faction?: string | null;
  race?: string | null;
}): CaptainTraitSlot[] {
  const personal = personalSpaceSlotCount(input.faction, input.race);

  const shipSpecific: CaptainTraitSlot[] = Array.from(
    { length: SHIP_SPECIFIC_SLOTS },
    (_, index) => ({
      id: `starshipTrait-${index}`,
      group: "shipSpecific" as const,
      label: CAPTAIN_TRAIT_GROUP_LABEL.shipSpecific,
      index,
      catalogKind: "starshipTrait" as const,
      storage: "loadout" as const,
    }),
  );

  return [
    ...numbered(
      "personalSpace",
      "trait",
      "character",
      personal,
      "personalSpace",
    ),
    ...numbered(
      "starship",
      "starshipTrait",
      "character",
      CAPTAIN_STARSHIP_SLOTS,
      "captainStarship",
    ),
    ...shipSpecific,
    ...numbered(
      "spaceReputation",
      "trait",
      "character",
      CAPTAIN_REPUTATION_SLOTS,
      "spaceReputation",
    ),
    ...numbered(
      "activeSpaceReputation",
      "trait",
      "character",
      CAPTAIN_ACTIVE_REPUTATION_SLOTS,
      "activeSpaceReputation",
    ),
  ];
}

export function groupCaptainTraitSlots(
  slots: readonly CaptainTraitSlot[],
): Array<{ group: CaptainTraitGroup; label: string; slots: CaptainTraitSlot[] }> {
  return CAPTAIN_TRAIT_GROUP_ORDER.map((group) => ({
    group,
    label: CAPTAIN_TRAIT_GROUP_LABEL[group],
    slots: slots.filter((slot) => slot.group === group),
  })).filter((section) => section.slots.length > 0);
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function environmentIsSpace(environment: string | null | undefined): boolean {
  return normalize(environment) === "space";
}

function typeIs(trait: Pick<CaptainTraitSource, "type">, expected: string): boolean {
  return normalize(trait.type) === expected;
}

/**
 * Wiki `required` lists species that may take a racial personal trait
 * ("Human,", "Joined Trill,"). Empty required means any species.
 */
export function traitAllowsRace(
  required: string | null | undefined,
  raceLabel: string | null | undefined,
): boolean {
  const names = (required ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return true;
  const race = raceLabel?.trim().toLowerCase();
  if (!race) return true;
  return names.some(
    (name) => name === race || name.includes(race) || race.includes(name),
  );
}

export function traitAllowsCareer(
  traitCareer: string | null | undefined,
  captainCareer: CaptainCareer | null | undefined,
): boolean {
  const code = normalize(traitCareer);
  if (!code) return true;
  const expected = careerTraitCode(captainCareer);
  if (!expected) return true;
  return code === expected;
}

export function traitFitsCaptainSlot(
  trait: CaptainTraitSource,
  slot: Pick<CaptainTraitSlot, "group" | "catalogKind">,
  identity?: {
    career?: CaptainCareer | null;
    raceLabel?: string | null;
  },
): boolean {
  const kind = trait.catalogKind ?? "trait";
  if (kind !== slot.catalogKind) return false;

  if (slot.group === "starship" || slot.group === "shipSpecific") {
    return kind === "starshipTrait";
  }
  if (!environmentIsSpace(trait.environment)) return false;

  if (slot.group === "personalSpace") {
    return (
      typeIs(trait, "char") &&
      traitAllowsCareer(trait.career, identity?.career) &&
      traitAllowsRace(trait.required, identity?.raceLabel)
    );
  }
  if (slot.group === "spaceReputation") {
    return typeIs(trait, "reputation");
  }
  if (slot.group === "activeSpaceReputation") {
    return typeIs(trait, "activereputation");
  }
  return false;
}

export function captainTraitOwnershipKey(
  catalogKind: CaptainTraitCatalogKind | undefined,
  itemId: number,
): string {
  return `${catalogKind ?? "trait"}:${itemId}`;
}

export function fillForCaptainSlot(
  fills: readonly CaptainTraitFill[] | null | undefined,
  slotId: string,
): CaptainTraitFill | null {
  if (!fills) return null;
  return fills.find((fill) => fill.slotId === slotId) ?? null;
}

/** Drop fills whose socket is gone (Alien extra slot) or locked. */
export function pruneCaptainTraitFills(
  fills: readonly CaptainTraitFill[] | null | undefined,
  slots: readonly CaptainTraitSlot[],
): CaptainTraitFill[] {
  if (!fills?.length) return [];
  const open = new Set(
    slots
      .filter((slot) => slot.storage === "character" && !slot.locked)
      .map((slot) => slot.id),
  );
  return fills.filter((fill) => open.has(fill.slotId));
}
