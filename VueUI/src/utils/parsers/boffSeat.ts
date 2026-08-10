export const BOFF_CAREERS = [
  "Tactical",
  "Engineering",
  "Science",
  "Universal",
] as const;

export type BoffCareer = (typeof BOFF_CAREERS)[number];

export interface BoffSeat {
  rank: string;
  career: BoffCareer;
  specialization?: string;
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
