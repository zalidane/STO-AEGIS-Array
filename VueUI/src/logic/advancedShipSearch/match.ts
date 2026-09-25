import { normalizeCatalogSearchText } from "@/utils/normalizeCatalogSearch";
import type {
  AdvancedShipSearchFilters,
  AdvancedShipSearchRow,
  YesNoChoice,
} from "./types";
import { createDefaultAdvancedShipSearchFilters } from "./types";

function matchesYesNo(
  value: boolean,
  selected: readonly YesNoChoice[],
): boolean {
  if (selected.length === 0) return true;
  const asChoice: YesNoChoice = value ? "yes" : "no";
  return selected.includes(asChoice);
}

function matchesNumberMulti(
  value: number,
  selected: readonly number[],
): boolean {
  if (selected.length === 0) return true;
  return selected.includes(value);
}

function matchesFullSpecs(
  row: AdvancedShipSearchRow,
  selected: AdvancedShipSearchFilters["fullSpecs"],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((choice) => {
    if (choice === "None") return !row.hasFullSpec;
    return row.fullSpecs.includes(choice);
  });
}

function matchesAcquisition(
  row: AdvancedShipSearchRow,
  codes: readonly string[],
): boolean {
  if (codes.length === 0) return true;
  return codes.some((code) => row.acquisitionCodes.includes(code));
}

function matchesFaction(
  row: AdvancedShipSearchRow,
  factions: readonly string[],
): boolean {
  if (factions.length === 0) return true;
  return factions.some(
    (faction) =>
      row.faction === faction ||
      row.faction.toLowerCase().includes(faction.toLowerCase()) ||
      faction.toLowerCase().includes(row.faction.toLowerCase()),
  );
}

function matchesSearch(row: AdvancedShipSearchRow, search: string): boolean {
  const needle = normalizeCatalogSearchText(search);
  if (!needle) return true;
  return normalizeCatalogSearchText(row.name).includes(needle);
}

/** True when a derived row satisfies every active filter dimension. */
export function matchesAdvancedShipSearchFilters(
  row: AdvancedShipSearchRow,
  filters: AdvancedShipSearchFilters,
): boolean {
  if (!matchesNumberMulti(row.foreWeapons, filters.foreWeapons)) return false;
  if (!matchesNumberMulti(row.aftWeapons, filters.aftWeapons)) return false;
  if (!matchesYesNo(row.experimental, filters.experimental)) return false;
  if (!matchesNumberMulti(row.totalWeapons, filters.totalWeapons)) return false;
  if (!matchesFullSpecs(row, filters.fullSpecs)) return false;
  if (!matchesYesNo(row.secondaryDeflector, filters.secondaryDeflector)) {
    return false;
  }
  if (!matchesNumberMulti(row.hangars, filters.hangars)) return false;
  if (!matchesNumberMulti(row.consoles.engineering, filters.engConsoles)) {
    return false;
  }
  if (!matchesNumberMulti(row.consoles.science, filters.sciConsoles)) {
    return false;
  }
  if (!matchesNumberMulti(row.consoles.tactical, filters.tacConsoles)) {
    return false;
  }
  if (!matchesNumberMulti(row.consoles.universal, filters.uniConsoles)) {
    return false;
  }
  if (!matchesYesNo(row.dualCannons, filters.dualCannons)) return false;
  if (!matchesAcquisition(row, filters.acquisition)) return false;
  if (!matchesFaction(row, filters.factions)) return false;
  if (!matchesYesNo(row.fleetAvailable, filters.fleetAvailable)) return false;
  if (!matchesSearch(row, filters.search)) return false;
  return true;
}

export function filterAdvancedShipSearchRows(
  rows: readonly AdvancedShipSearchRow[],
  filters: AdvancedShipSearchFilters,
): AdvancedShipSearchRow[] {
  return rows.filter((row) => matchesAdvancedShipSearchFilters(row, filters));
}

export function advancedShipSearchFiltersAreActive(
  filters: AdvancedShipSearchFilters,
): boolean {
  const defaults = createDefaultAdvancedShipSearchFilters();
  return (
    normalizeCatalogSearchText(filters.search).length > 0 ||
    filters.foreWeapons.length > 0 ||
    filters.aftWeapons.length > 0 ||
    filters.experimental.length > 0 ||
    filters.totalWeapons.length > 0 ||
    filters.fullSpecs.length > 0 ||
    filters.secondaryDeflector.length > 0 ||
    filters.hangars.length > 0 ||
    filters.engConsoles.length > 0 ||
    filters.sciConsoles.length > 0 ||
    filters.tacConsoles.length > 0 ||
    filters.uniConsoles.length > 0 ||
    filters.dualCannons.length > 0 ||
    filters.acquisition.length > 0 ||
    filters.factions.length > 0 ||
    filters.fleetAvailable.length > 0 ||
    JSON.stringify(filters) !== JSON.stringify(defaults)
  );
}

export function uniqueSortedNumbers(
  values: readonly (number | null | undefined)[],
): number[] {
  const set = new Set<number>();
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) set.add(value);
  }
  return [...set].sort((a, b) => a - b);
}
