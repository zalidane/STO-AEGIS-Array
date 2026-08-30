export const BOFF_CAREERS = [
  "Tactical",
  "Engineering",
  "Science",
  "Universal",
] as const;

export type BoffCareer = (typeof BOFF_CAREERS)[number];

/** Highest rank first. Unknown ranks sort after Ensign. */
export const BOFF_RANK_ORDER = [
  "commander",
  "lieutenant commander",
  "lieutenant",
  "ensign",
] as const;

export interface BoffSeat {
  rank: string;
  career: BoffCareer;
  specialization?: string;
}

function normalizeBoffRank(rank: string): string {
  const compact = rank
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
  if (compact === "cmdr") return "commander";
  if (compact === "ltcmdr" || compact === "lt commander") {
    return "lieutenant commander";
  }
  if (compact === "lt") return "lieutenant";
  if (compact === "ens") return "ensign";
  return compact;
}

export function boffRankIndex(rank: string): number {
  const normalized = normalizeBoffRank(rank);
  const index = BOFF_RANK_ORDER.indexOf(
    normalized as (typeof BOFF_RANK_ORDER)[number],
  );
  return index === -1 ? BOFF_RANK_ORDER.length : index;
}

/** Career plus specialization, for alphabetical type order. */
export function boffSeatTypeKey(seat: BoffSeat): string {
  const spec = seat.specialization?.trim() ?? "";
  return spec ? `${seat.career}-${spec}` : seat.career;
}

export function compareBoffSeats(a: BoffSeat, b: BoffSeat): number {
  const rankDiff = boffRankIndex(a.rank) - boffRankIndex(b.rank);
  if (rankDiff !== 0) return rankDiff;
  return boffSeatTypeKey(a).localeCompare(boffSeatTypeKey(b));
}

export function sortBoffSeatRaws(raws: readonly string[]): string[] {
  return [...raws]
    .map((raw, index) => ({ raw, index, seat: parseBoffSeat(raw) }))
    .sort((a, b) => {
      const order = compareBoffSeats(a.seat, b.seat);
      return order !== 0 ? order : a.index - b.index;
    })
    .map((item) => item.raw);
}

/**
 * Parse wiki BOff seat strings such as
 * "Lieutenant Commander Universal-Command" or "Commander Science-Intelligence".
 */
export function parseBoffSeat(boff: string): BoffSeat {
  const trimmed = boff.trim();
  const hyphenIndex = trimmed.indexOf("-");

  const main = hyphenIndex >= 0 ? trimmed.slice(0, hyphenIndex).trim() : trimmed;
  const specialization =
    hyphenIndex >= 0 ? trimmed.slice(hyphenIndex + 1).trim() : undefined;

  let career: BoffCareer = "Universal";
  let rank = main;

  for (const candidate of BOFF_CAREERS) {
    if (main.endsWith(candidate)) {
      career = candidate;
      rank = main.slice(0, -candidate.length).trim();
      break;
    }
  }

  return {
    rank,
    career,
    specialization: specialization || undefined,
  };
}
