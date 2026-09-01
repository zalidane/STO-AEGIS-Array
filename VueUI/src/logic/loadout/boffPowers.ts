import {
  BOFF_RANK_ORDER,
  parseBoffSeat,
  sortBoffSeatRaws,
  type BoffCareer,
  type BoffSeat,
} from "@/utils/parsers/boffSeat";

export const BOFF_PLAYABLE_CAREERS = [
  "Tactical",
  "Engineering",
  "Science",
] as const;

export type BoffPlayableCareer = (typeof BOFF_PLAYABLE_CAREERS)[number];

export type BoffOfficerRank = (typeof BOFF_RANK_ORDER)[number];

export const BOFF_CATALOG_KIND = "traySkill" as const;

const RANK_ROMANS = ["I", "II", "III", "IV", "V"] as const;

const RANK_SLOT_IDS: Record<BoffOfficerRank, string> = {
  ensign: "ensign",
  lieutenant: "lieutenant",
  "lieutenant commander": "ltcmdr",
  commander: "commander",
};

export const BOFF_RANK_ABBREV: Record<BoffOfficerRank, string> = {
  ensign: "ENS",
  lieutenant: "LT",
  "lieutenant commander": "LTC",
  commander: "CDR",
};

export function boffRankAbbrev(rank: string): string {
  const canonical = canonicalOfficerRank(rank);
  return canonical ? BOFF_RANK_ABBREV[canonical] : rank;
}

export type BoffPowerSource = {
  id: number;
  name: string;
  type: string | null;
  region: string | null;
  ranks: ReadonlyArray<string | null | undefined>;
};

export type BoffStationSlot = {
  id: string;
  stationIndex: number;
  rank: BoffOfficerRank;
  rankLabel: string;
};

export type BoffStation = {
  index: number;
  seat: BoffSeat;
  raw: string;
  needsCareerChoice: boolean;
  careerChoice: BoffPlayableCareer | null;
  slots: BoffStationSlot[];
};

export type BoffSeatCareerMap = Record<string, BoffPlayableCareer>;

function flattenWikiValue(value: string): string {
  return value
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalOfficerRank(
  raw: string | null | undefined,
): BoffOfficerRank | null {
  if (!raw?.trim()) return null;
  const text = flattenWikiValue(raw)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text === "ensign" || text === "ens") return "ensign";
  if (text === "lieutenant" || text === "lt") return "lieutenant";
  if (
    text === "lieutenant commander" ||
    text === "lt commander" ||
    text === "ltcmdr"
  ) {
    return "lieutenant commander";
  }
  if (text === "commander" || text === "cmdr") return "commander";
  return null;
}

/**
 * STO ability bar is lowest rank on the left: Ensign → Commander.
 * A Commander seat has four sockets; Ensign has one.
 */
export function abilityRanksForSeat(rank: string): BoffOfficerRank[] {
  const highest = canonicalOfficerRank(rank);
  if (!highest) return [];
  const highIndex = BOFF_RANK_ORDER.indexOf(highest);
  return [...BOFF_RANK_ORDER].slice(highIndex).reverse();
}

export function boffStationSlotId(
  stationIndex: number,
  rank: BoffOfficerRank,
): string {
  return `boff-${stationIndex}-${RANK_SLOT_IDS[rank]}`;
}

export function parseBoffStationSlotId(
  slotId: string,
): { stationIndex: number; rank: BoffOfficerRank } | null {
  const match = /^boff-(\d+)-(ensign|lieutenant|ltcmdr|commander)$/.exec(
    slotId,
  );
  if (!match) return null;
  const rankKey = match[2] as (typeof RANK_SLOT_IDS)[BoffOfficerRank];
  const rank = (
    Object.entries(RANK_SLOT_IDS) as Array<[BoffOfficerRank, string]>
  ).find(([, id]) => id === rankKey)?.[0];
  if (!rank) return null;
  return { stationIndex: Number(match[1]), rank };
}

function rawSeatList(boffs: string | null | undefined): string[] {
  if (!boffs?.trim()) return [];
  return sortBoffSeatRaws(
    boffs
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

export function isPlayableCareer(
  value: string | null | undefined,
): value is BoffPlayableCareer {
  return value === "Tactical" || value === "Engineering" || value === "Science";
}

function normalizeProfession(value: string | null | undefined): string {
  const text = flattenWikiValue(value ?? "").toLowerCase();
  if (text === "intel") return "intelligence";
  if (text === "temporal") return "temporal operative";
  return text;
}

export function matchingPowerRankIndex(
  power: Pick<BoffPowerSource, "ranks">,
  slotRank: BoffOfficerRank,
): number | null {
  for (let index = 0; index < power.ranks.length; index += 1) {
    if (canonicalOfficerRank(power.ranks[index]) === slotRank) return index;
  }
  return null;
}

export function boffPowerDisplayName(
  power: Pick<BoffPowerSource, "name" | "ranks">,
  slotRank: BoffOfficerRank,
): string {
  const index = matchingPowerRankIndex(power, slotRank);
  const roman = index != null ? RANK_ROMANS[index] : null;
  return roman ? `${power.name} ${roman}` : power.name;
}

export function powerRegionIsSpace(region: string | null | undefined): boolean {
  return (region ?? "").trim().toLowerCase() === "space";
}

export function powerProfessionAllowed(
  powerType: string | null | undefined,
  station: Pick<BoffStation, "seat" | "careerChoice">,
): boolean {
  const profession = normalizeProfession(powerType);
  if (!profession) return false;

  const spec = normalizeProfession(station.seat.specialization);
  if (spec && profession === spec) return true;

  const career = station.careerChoice;
  if (!career) return false;
  return profession === career.toLowerCase();
}

export function powerFitsBoffSlot(
  power: BoffPowerSource,
  slot: Pick<BoffStationSlot, "rank" | "stationIndex">,
  station: Pick<BoffStation, "index" | "seat" | "careerChoice">,
): boolean {
  if (slot.stationIndex !== station.index) return false;
  if (!powerRegionIsSpace(power.region)) return false;
  if (matchingPowerRankIndex(power, slot.rank) == null) return false;
  return powerProfessionAllowed(power.type, station);
}

export function buildBoffStations(
  boffs: string | null | undefined,
  careers: BoffSeatCareerMap | null | undefined,
): BoffStation[] {
  return rawSeatList(boffs).map((raw, index) => {
    const seat = parseBoffSeat(raw);
    const needsCareerChoice = seat.career === "Universal";
    const chosen = careers?.[String(index)];
    const careerChoice: BoffPlayableCareer | null = needsCareerChoice
      ? isPlayableCareer(chosen)
        ? chosen
        : null
      : isPlayableCareer(seat.career)
        ? seat.career
        : null;
    const slots = abilityRanksForSeat(seat.rank).map((rank) => ({
      id: boffStationSlotId(index, rank),
      stationIndex: index,
      rank,
      rankLabel: BOFF_RANK_ABBREV[rank],
    }));
    return {
      index,
      seat,
      raw,
      needsCareerChoice,
      careerChoice,
      slots,
    };
  });
}

export function boffSlotIds(
  stations: ReadonlyArray<Pick<BoffStation, "slots">>,
): Set<string> {
  return new Set(
    stations.flatMap((station) => station.slots.map((slot) => slot.id)),
  );
}

export function stationForSlot(
  stations: readonly BoffStation[],
  slotId: string,
): { station: BoffStation; slot: BoffStationSlot } | null {
  for (const station of stations) {
    const slot = station.slots.find((row) => row.id === slotId);
    if (slot) return { station, slot };
  }
  return null;
}

export function sanitizeBoffSeatCareers(
  value: unknown,
): BoffSeatCareerMap | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const next: BoffSeatCareerMap = {};
  for (const [key, career] of Object.entries(value)) {
    if (!/^\d+$/.test(key) || !isPlayableCareer(career)) continue;
    next[key] = career;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function careerForSeat(
  seat: BoffSeat,
  chosen: BoffPlayableCareer | null | undefined,
): BoffCareer {
  if (seat.career !== "Universal") return seat.career;
  return chosen ?? "Universal";
}
