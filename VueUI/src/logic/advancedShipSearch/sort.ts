import type {
  AdvancedShipSearchRow,
  AdvancedShipSearchSort,
  AdvancedShipSearchSortKey,
} from "./types";

function consoleSortKey(row: AdvancedShipSearchRow): string {
  const { engineering, science, tactical, universal } = row.consoles;
  return [
    String(tactical).padStart(2, "0"),
    String(engineering).padStart(2, "0"),
    String(science).padStart(2, "0"),
    String(universal).padStart(2, "0"),
  ].join("|");
}

function fullSpecSortKey(row: AdvancedShipSearchRow): string {
  return row.fullSpecs.join(",") || "None";
}

function compareValues(
  left: string | number | boolean,
  right: string | number | boolean,
): number {
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

function sortValue(
  row: AdvancedShipSearchRow,
  key: AdvancedShipSearchSortKey,
): string | number | boolean {
  switch (key) {
    case "name":
      return row.name;
    case "foreWeapons":
      return row.foreWeapons;
    case "aftWeapons":
      return row.aftWeapons;
    case "experimental":
      return row.experimental;
    case "totalWeapons":
      return row.totalWeapons;
    case "fullSpecs":
      return fullSpecSortKey(row);
    case "secondaryDeflector":
      return row.secondaryDeflector;
    case "hangars":
      return row.hangars;
    case "consoles":
      return consoleSortKey(row);
    case "dualCannons":
      return row.dualCannons;
    case "acquisition":
      return row.acquisitionLabel;
    case "faction":
      return row.faction;
    case "fleetAvailable":
      return row.fleetAvailable;
  }
}

export function sortAdvancedShipSearchRows(
  rows: readonly AdvancedShipSearchRow[],
  sort: AdvancedShipSearchSort,
): AdvancedShipSearchRow[] {
  const direction = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const primary =
      compareValues(sortValue(left, sort.key), sortValue(right, sort.key)) *
      direction;
    if (primary !== 0) return primary;
    return left.name.localeCompare(right.name);
  });
}

export const DEFAULT_ADVANCED_SHIP_SEARCH_SORT: AdvancedShipSearchSort = {
  key: "name",
  direction: "asc",
};
