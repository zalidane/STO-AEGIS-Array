/** Idle gap that starts a new fight. STO logs do not include map names. */
export const COMBAT_IDLE_GAP_MS = 100_000;

export type CombatParseFailure = "empty" | "no-captain" | "no-fights";

export type CombatFightSummary = {
  index: number;
  durationMs: number;
  damageOut: number;
  dps: number;
  damageTaken: number;
  allyHeals: number;
  solo: boolean;
  otherPlayerCount: number;
  mixLabel: string;
  rankNotes: string[];
  participation: string;
};

export type CombatParseSummary = {
  uploadedAt: string;
  fileName: string;
  captainId: string;
  captainLabel: string;
  fights: CombatFightSummary[];
};

export type ParseCombatLogInput = {
  captainName: string;
  fileName: string;
  uploadedAt: string;
};

export type ParseCombatLogResult =
  | { ok: true; parse: CombatParseSummary }
  | { ok: false; reason: CombatParseFailure };

export type CombatLine = {
  at: number;
  ownerDisplay: string;
  ownerInternal: string;
  sourceInternal: string;
  targetInternal: string;
  type: string;
  flags: string;
  magnitude: number;
  magnitudeBase: number;
  heal: boolean;
};

export type PlayerRef = {
  id: string;
  characterName: string;
  handle: string;
  displayName: string;
};
