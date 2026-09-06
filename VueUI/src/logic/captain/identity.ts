export const CAPTAIN_CAREERS = [
  { id: "tactical", label: "Tactical", traitCode: "tac" },
  { id: "engineering", label: "Engineering", traitCode: "eng" },
  { id: "science", label: "Science", traitCode: "sci" },
] as const;

export type CaptainCareer = (typeof CAPTAIN_CAREERS)[number]["id"];

/** Captain primary/secondary trees. Commando is ground-only; the rest are used in space. */
export const CAPTAIN_SPECIALIZATIONS = [
  { id: "intelligence", label: "Intelligence" },
  { id: "command", label: "Command" },
  { id: "pilot", label: "Pilot" },
  { id: "temporal", label: "Temporal Operative" },
  { id: "miracle", label: "Miracle Worker" },
  { id: "strategist", label: "Strategist" },
  { id: "constable", label: "Constable" },
  { id: "commando", label: "Commando" },
] as const;

export type CaptainSpecialization = (typeof CAPTAIN_SPECIALIZATIONS)[number]["id"];

export type CaptainRace = {
  id: string;
  label: string;
  /** Alien (and similar) captains get one extra personal space/ground trait slot. */
  extraPersonalTrait?: boolean;
};

export type CaptainFaction = {
  id: string;
  label: string;
  races: readonly CaptainRace[];
};

const ALIEN: CaptainRace = { id: "alien", label: "Alien", extraPersonalTrait: true };

/**
 * Playable factions and species at character create.
 * Cross-faction unlocks are omitted; Alien is on every list.
 */
export const CAPTAIN_FACTIONS: readonly CaptainFaction[] = [
  {
    id: "federation",
    label: "Federation",
    races: [
      { id: "human", label: "Human" },
      { id: "andorian", label: "Andorian" },
      { id: "bajoran", label: "Bajoran" },
      { id: "benzite", label: "Benzite" },
      { id: "betazoid", label: "Betazoid" },
      { id: "bolian", label: "Bolian" },
      { id: "caitian", label: "Caitian" },
      { id: "ferengi", label: "Ferengi" },
      { id: "joined-trill", label: "Joined Trill" },
      { id: "pakled", label: "Pakled" },
      { id: "rigelian", label: "Rigelian" },
      { id: "saurian", label: "Saurian" },
      { id: "tellarite", label: "Tellarite" },
      { id: "trill", label: "Trill" },
      { id: "vulcan", label: "Vulcan" },
      { id: "liberated-borg", label: "Liberated Borg" },
      ALIEN,
    ],
  },
  {
    id: "klingon",
    label: "Klingon Empire",
    races: [
      { id: "klingon", label: "Klingon" },
      { id: "gorn", label: "Gorn" },
      { id: "lethean", label: "Lethean" },
      { id: "nausicaan", label: "Nausicaan" },
      { id: "orion", label: "Orion" },
      { id: "liberated-borg", label: "Liberated Borg" },
      ALIEN,
    ],
  },
  {
    id: "romulan",
    label: "Romulan Republic",
    races: [
      { id: "romulan", label: "Romulan" },
      { id: "reman", label: "Reman" },
      { id: "liberated-borg", label: "Liberated Borg" },
      ALIEN,
    ],
  },
  {
    id: "dominion",
    label: "Dominion",
    races: [
      { id: "jemhadar", label: "Jem'Hadar" },
      { id: "jemhadar-vanguard", label: "Jem'Hadar Vanguard" },
      ALIEN,
    ],
  },
  {
    id: "tos",
    label: "TOS Starfleet",
    races: [
      { id: "human", label: "Human" },
      { id: "vulcan", label: "Vulcan" },
      { id: "andorian", label: "Andorian" },
      { id: "tellarite", label: "Tellarite" },
      ALIEN,
    ],
  },
  {
    id: "dsc",
    label: "DSC Starfleet",
    races: [
      { id: "human", label: "Human" },
      { id: "vulcan", label: "Vulcan" },
      { id: "andorian", label: "Andorian" },
      { id: "tellarite", label: "Tellarite" },
      { id: "kelpien", label: "Kelpien" },
      ALIEN,
    ],
  },
];

export type CaptainIdentity = {
  career: CaptainCareer;
  faction: string;
  race: string;
};

export type CaptainIdentityDraft = {
  career: CaptainCareer | "";
  faction: string;
  race: string;
  primarySpecialization: CaptainSpecialization | "";
  secondarySpecialization: CaptainSpecialization | "";
};

export function emptyCaptainIdentityDraft(): CaptainIdentityDraft {
  return {
    career: "",
    faction: "",
    race: "",
    primarySpecialization: "",
    secondarySpecialization: "",
  };
}

export function factionById(factionId: string | null | undefined): CaptainFaction | null {
  if (!factionId) return null;
  return CAPTAIN_FACTIONS.find((faction) => faction.id === factionId) ?? null;
}

export function raceById(
  factionId: string | null | undefined,
  raceId: string | null | undefined,
): CaptainRace | null {
  if (!raceId) return null;
  const faction = factionById(factionId);
  const pool = faction?.races ?? CAPTAIN_FACTIONS.flatMap((row) => row.races);
  return pool.find((race) => race.id === raceId) ?? null;
}

export function careerById(careerId: string | null | undefined): CaptainCareer | null {
  if (!careerId) return null;
  return CAPTAIN_CAREERS.some((career) => career.id === careerId)
    ? (careerId as CaptainCareer)
    : null;
}

export function careerLabel(careerId: string | null | undefined): string {
  return CAPTAIN_CAREERS.find((career) => career.id === careerId)?.label ?? "";
}

export function factionLabel(factionId: string | null | undefined): string {
  return factionById(factionId)?.label ?? "";
}

export function raceLabel(
  factionId: string | null | undefined,
  raceId: string | null | undefined,
): string {
  return raceById(factionId, raceId)?.label ?? "";
}

export function hasExtraPersonalTraitSlot(
  factionId: string | null | undefined,
  raceId: string | null | undefined,
): boolean {
  return raceById(factionId, raceId)?.extraPersonalTrait === true;
}

export function isCompleteIdentity(
  value: Partial<CaptainIdentity> | null | undefined,
): value is CaptainIdentity {
  if (!value) return false;
  return (
    careerById(value.career) != null &&
    factionById(value.faction) != null &&
    raceById(value.faction, value.race) != null
  );
}

export function careerTraitCode(career: CaptainCareer | null | undefined): string | null {
  if (!career) return null;
  return CAPTAIN_CAREERS.find((row) => row.id === career)?.traitCode ?? null;
}

export function specializationById(
  specId: string | null | undefined,
): CaptainSpecialization | null {
  if (!specId) return null;
  return CAPTAIN_SPECIALIZATIONS.some((spec) => spec.id === specId)
    ? (specId as CaptainSpecialization)
    : null;
}

export function specializationLabel(specId: string | null | undefined): string {
  return (
    CAPTAIN_SPECIALIZATIONS.find((spec) => spec.id === specId)?.label ?? ""
  );
}

export function captainIdentityDraftFrom(
  value: {
    career?: string | null;
    faction?: string | null;
    race?: string | null;
    primarySpecialization?: string | null;
    secondarySpecialization?: string | null;
  } | null | undefined,
): CaptainIdentityDraft {
  const sanitized = sanitizeCaptainSpecializations(
    value?.primarySpecialization,
    value?.secondarySpecialization,
  );
  return {
    career: careerById(value?.career) ?? "",
    faction: value?.faction?.trim() ?? "",
    race: value?.race?.trim() ?? "",
    primarySpecialization: sanitized.primarySpecialization ?? "",
    secondarySpecialization: sanitized.secondarySpecialization ?? "",
  };
}

/** Primary is required for a secondary; the two trees cannot be the same. */
export function sanitizeCaptainSpecializations(
  primary?: string | null,
  secondary?: string | null,
): {
  primarySpecialization?: CaptainSpecialization;
  secondarySpecialization?: CaptainSpecialization;
} {
  const primaryId = specializationById(primary);
  if (!primaryId) return {};
  const secondaryId = specializationById(secondary);
  if (!secondaryId || secondaryId === primaryId) {
    return { primarySpecialization: primaryId };
  }
  return {
    primarySpecialization: primaryId,
    secondarySpecialization: secondaryId,
  };
}
