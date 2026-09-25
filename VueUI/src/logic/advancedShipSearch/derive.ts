import {
  formatHullConsoleSummary,
  hullConsoleCounts,
} from "@/logic/loadout/consoleSummary";
import { isFleetShip } from "@/logic/shipsBinder";
import { parseBoffSeat } from "@/utils/parsers/boffSeat";
import { parseShipCost } from "@/utils/parsers/shipCost";
import { resolvePrimaryFaction } from "@/logic/resolvePrimaryFaction";
import {
  buildFleetAvailabilityIndex,
  shipHasFleetVersion,
} from "./fleetAvailable";
import type {
  AdvancedShipSearchRow,
  AdvancedShipSearchSource,
  FullSpecOption,
} from "./types";
import { FULL_SPEC_OPTIONS } from "./types";

/** Map wiki specialization strings onto filter labels. */
export function normalizeFullSpec(
  specialization: string | null | undefined,
): FullSpecOption | null {
  if (!specialization?.trim()) return null;
  const raw = specialization.trim().toLowerCase();
  if (raw === "command") return "Command";
  if (raw === "intelligence" || raw === "intel") return "Intel";
  if (raw === "miracle worker") return "Miracle Worker";
  if (raw === "temporal operative" || raw === "temporal") return "Temporal";
  if (raw === "pilot") return "Pilot";
  return null;
}

export function extractFullSpecs(
  boffs: string | null | undefined,
): FullSpecOption[] {
  if (!boffs?.trim()) return [];
  const found = new Set<FullSpecOption>();
  for (const part of boffs.split(",")) {
    const seat = parseBoffSeat(part.trim());
    const spec = normalizeFullSpec(seat.specialization);
    if (spec) found.add(spec);
  }
  return FULL_SPEC_OPTIONS.filter((option) => found.has(option));
}

function countOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Total weapons = fore + aft + 1 if an experimental weapon seat is present.
 * Null/missing fore or aft count as 0. Null/false experimental adds 0.
 */
export function totalWeaponCount(input: {
  foreWeapons?: number | null;
  aftWeapons?: number | null;
  experimental?: boolean | null;
}): number {
  return (
    countOrZero(input.foreWeapons) +
    countOrZero(input.aftWeapons) +
    (input.experimental === true ? 1 : 0)
  );
}

export function deriveAdvancedShipSearchRow(
  ship: AdvancedShipSearchSource,
  fleetKeys: ReadonlySet<string>,
): AdvancedShipSearchRow {
  const consoles = hullConsoleCounts(ship);
  const fullSpecs = extractFullSpecs(ship.boffs);
  const costs = parseShipCost(ship.cost);
  const acquisitionCodes = [
    ...new Set(costs.map((cost) => cost.currencyCode).filter(Boolean)),
  ];
  const acquisitionLabel = costs
    .map((cost) =>
      cost.amount ? `${cost.amount} ${cost.label}` : cost.label,
    )
    .join(" / ");
  const foreWeapons = countOrZero(ship.foreWeapons);
  const aftWeapons = countOrZero(ship.aftWeapons);
  const experimental = ship.experimental === true;

  return {
    id: ship.id,
    name: ship.name,
    foreWeapons,
    aftWeapons,
    experimental,
    totalWeapons: totalWeaponCount({
      foreWeapons,
      aftWeapons,
      experimental,
    }),
    fullSpecs,
    hasFullSpec: fullSpecs.length > 0,
    secondaryDeflector: ship.secondaryDeflector === true,
    hangars: countOrZero(ship.hangars),
    consoles,
    consoleLabel: formatHullConsoleSummary(ship) || "—",
    dualCannons: ship.equipCannons === true,
    acquisitionCodes,
    acquisitionLabel: acquisitionLabel || "—",
    faction: resolvePrimaryFaction(ship) || "—",
    fleetAvailable: shipHasFleetVersion(ship, fleetKeys),
    isFleet: isFleetShip(ship),
  };
}

export function indexAdvancedShipSearchRows(
  ships: readonly AdvancedShipSearchSource[],
): AdvancedShipSearchRow[] {
  const fleetKeys = buildFleetAvailabilityIndex(ships);
  return ships.map((ship) => deriveAdvancedShipSearchRow(ship, fleetKeys));
}
