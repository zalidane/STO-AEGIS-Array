const BOFF_ABBREVIATIONS: Array<[string, string]> = [
  ["Lieutenant Commander", "LtCmdr"],
  ["Commander", "Cmdr"],
  ["Lieutenant", "Lt"],
  ["Ensign", "Ens"],
  ["Engineering", "ENG"],
  ["Science", "SCI"],
  ["Tactical", "TAC"],
  ["Universal", "UNI"],
  ["Intelligence", "INT"],
  ["Intel", "INT"],
  ["Command", "CMD"],
  ["Pilot", "PIL"],
  ["Miracle Worker", "MW"],
  ["Temporal Operative", "TMP"],
  ["Temporal", "TMP"],
];

/** Abbreviate a rank, career, or specialization fragment. */
export function abbreviateBoffPart(part: string): string {
  let result = part.trim();

  for (const [full, short] of BOFF_ABBREVIATIONS) {
    result = result.split(full).join(short);
  }

  return result;
}

/** Abbreviate a full BOff seat string for compact chips. */
export function abbreviateBoff(boff: string): string {
  return abbreviateBoffPart(boff);
}

/**
 * Collection-list rank token: `CMDR`, `LT CMDR`, `LT`, `ENS`.
 * Keeps a space in Lieutenant Commander so it reads like `LT CMDR-MW`.
 */
export function collectionBoffRankAbbrev(rank: string): string {
  const short = abbreviateBoffPart(rank);
  if (short === "LtCmdr") return "LT CMDR";
  return short.toUpperCase();
}

/**
 * One Collection-list seat token: `CMDR-INT`, `LT CMDR-MW`, `LT-TAC`.
 * Prefers specialization when present, otherwise career.
 */
export function formatCollectionBoffSeat(input: {
  rank: string;
  career: string;
  specialization?: string | null;
}): string {
  const rank = collectionBoffRankAbbrev(input.rank);
  const tail = abbreviateBoffPart(
    input.specialization?.trim() || input.career,
  ).toUpperCase();
  return `${rank}-${tail}`;
}

/** Pipe-separated Collection BOff line, e.g. `CMDR-INT | LT CMDR-MW | LT-TAC`. */
export function formatHullBoffSummary(
  seats: ReadonlyArray<{
    rank: string;
    career: string;
    specialization?: string | null;
  }>,
): string {
  return seats.map(formatCollectionBoffSeat).join(" | ");
}
