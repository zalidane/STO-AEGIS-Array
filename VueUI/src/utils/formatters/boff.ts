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
    result = result.replaceAll(full, short);
  }

  return result;
}

/** Abbreviate a full BOff seat string for compact chips. */
export function abbreviateBoff(boff: string): string {
  return abbreviateBoffPart(boff);
}
