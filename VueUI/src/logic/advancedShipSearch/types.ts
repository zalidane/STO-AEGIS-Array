import type { HullConsoleCounts } from "@/logic/loadout/consoleSummary";

/** Canonical specialization labels used in filters and the results table. */
export const FULL_SPEC_OPTIONS = [
  "Command",
  "Intel",
  "Miracle Worker",
  "Temporal",
  "Pilot",
] as const;

export type FullSpecOption = (typeof FULL_SPEC_OPTIONS)[number];

/** Tri-state yes/no filter; empty selection means “any”. */
export type YesNoChoice = "yes" | "no";

export type AdvancedShipSearchFilters = {
  /** Fore weapon slot counts (OR within). */
  foreWeapons: number[];
  /** Aft weapon slot counts (OR within). */
  aftWeapons: number[];
  /** Experimental weapon seat. */
  experimental: YesNoChoice[];
  /**
   * Full-spec (specialization) seats present on the hull.
   * OR within. Includes `"None"` for hulls with no specialization seating.
   */
  fullSpecs: Array<FullSpecOption | "None">;
  secondaryDeflector: YesNoChoice[];
  /** Hangar bay counts; null/missing hangars count as 0. */
  hangars: number[];
  /** Console counts per career (OR within each career; AND across careers). */
  engConsoles: number[];
  sciConsoles: number[];
  tacConsoles: number[];
  uniConsoles: number[];
  dualCannons: YesNoChoice[];
  /** Acquisition currency codes from wiki `cost` (OR within). */
  acquisition: string[];
  /** Faction lede labels (OR within; excludes non-matches). */
  factions: string[];
  fleetAvailable: YesNoChoice[];
  /** Free-text name filter (AND with structured filters). */
  search: string;
};

export type AdvancedShipSearchSortKey =
  | "name"
  | "foreWeapons"
  | "aftWeapons"
  | "experimental"
  | "fullSpecs"
  | "secondaryDeflector"
  | "hangars"
  | "consoles"
  | "dualCannons"
  | "acquisition"
  | "faction"
  | "fleetAvailable";

export type AdvancedShipSearchSort = {
  key: AdvancedShipSearchSortKey;
  direction: "asc" | "desc";
};

/** Catalog fields needed to index / match a hull. */
export type AdvancedShipSearchSource = {
  id: number;
  name: string;
  displayClass?: string | null;
  displayPrefix?: string | null;
  tier?: number | null;
  foreWeapons?: number | null;
  aftWeapons?: number | null;
  experimental?: boolean | null;
  equipCannons?: boolean | null;
  secondaryDeflector?: boolean | null;
  hangars?: number | null;
  tacticalSlots?: number | null;
  engineeringSlots?: number | null;
  scienceSlots?: number | null;
  t5uConsole?: string | null;
  boffs?: string | null;
  cost?: string | null;
  faction?: string | null;
  factionLede?: string | null;
  facSort?: string | null;
};

/** Derived row used for filtering, sorting, and the results table. */
export type AdvancedShipSearchRow = {
  id: number;
  name: string;
  foreWeapons: number;
  aftWeapons: number;
  experimental: boolean;
  fullSpecs: FullSpecOption[];
  hasFullSpec: boolean;
  secondaryDeflector: boolean;
  hangars: number;
  consoles: HullConsoleCounts;
  consoleLabel: string;
  dualCannons: boolean;
  acquisitionCodes: string[];
  acquisitionLabel: string;
  faction: string;
  fleetAvailable: boolean;
  isFleet: boolean;
};

export function createDefaultAdvancedShipSearchFilters(): AdvancedShipSearchFilters {
  return {
    foreWeapons: [],
    aftWeapons: [],
    experimental: [],
    fullSpecs: [],
    secondaryDeflector: [],
    hangars: [],
    engConsoles: [],
    sciConsoles: [],
    tacConsoles: [],
    uniConsoles: [],
    dualCannons: [],
    acquisition: [],
    factions: [],
    fleetAvailable: [],
    search: "",
  };
}
