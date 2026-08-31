import type { CombatParseSummary } from "./types";

export function formatCombatDps(dps: number): string {
  return Math.round(dps).toLocaleString("en-US");
}

export function formatCombatDuration(ms: number): string {
  const seconds = Math.max(ms, 0) / 1000;
  if (seconds < 60) {
    const rounded = seconds >= 10 ? Math.round(seconds) : Number(seconds.toFixed(1));
    return `${rounded}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function peakFightDps(parse: CombatParseSummary | null | undefined): number {
  if (!parse || parse.fights.length === 0) return 0;
  return parse.fights.reduce((max, fight) => Math.max(max, fight.dps), 0);
}

export const COMBAT_PARSE_ERRORS: Record<
  "empty" | "no-captain" | "no-fights",
  string
> = {
  empty: "That file has no combat lines.",
  "no-captain":
    "No player in this log matches this captain’s name. Space logs use the in-game character or ship name (often a first name).",
  "no-fights": "This captain did not appear in any fight.",
};
