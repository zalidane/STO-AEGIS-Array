import type { HullConsoleCounts } from "@/logic/loadout/consoleSummary";

export type WeaponLayout = {
  foreWeapons: number;
  aftWeapons: number;
  experimental: boolean;
};

/**
 * Fore / aft / experimental as a single slash triple.
 * Experimental is numeric: seat present → 1, absent → 0.
 * Examples: `5/2/1`, `4/3/0`.
 */
export function formatWeaponLayout(layout: WeaponLayout): string {
  const experimental = layout.experimental ? 1 : 0;
  return `${layout.foreWeapons}/${layout.aftWeapons}/${experimental}`;
}

/** Sort combined weapon layouts by fore, then aft, then experimental. */
export function compareWeaponLayouts(
  left: WeaponLayout,
  right: WeaponLayout,
): number {
  return (
    left.foreWeapons - right.foreWeapons ||
    left.aftWeapons - right.aftWeapons ||
    Number(left.experimental) - Number(right.experimental)
  );
}

const SEARCH_CONSOLE_PARTS: ReadonlyArray<{
  key: keyof HullConsoleCounts;
  label: "E" | "S" | "T" | "U";
}> = [
  { key: "engineering", label: "E" },
  { key: "science", label: "S" },
  { key: "tactical", label: "T" },
  { key: "universal", label: "U" },
];

/**
 * Compact console summary for Advanced Ship Search.
 * Same counts and order as the long form (`5 x ENG | …`), with one-letter
 * careers and no `x`. Zero careers are omitted. Example: `5 E | 2 S | 3 T | 1 U`.
 */
export function formatSearchConsoleLabel(counts: HullConsoleCounts): string {
  return SEARCH_CONSOLE_PARTS.filter((part) => counts[part.key] > 0)
    .map((part) => `${counts[part.key]} ${part.label}`)
    .join(" | ");
}
