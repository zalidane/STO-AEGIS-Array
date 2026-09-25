import { isFleetShip } from "@/logic/shipsBinder";
import type { AdvancedShipSearchSource } from "./types";

export type FleetAvailabilityShip = Pick<
  AdvancedShipSearchSource,
  "id" | "name" | "displayClass" | "displayPrefix" | "tier"
>;

function classKey(displayClass: string | null | undefined): string | null {
  const trimmed = displayClass?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * Build a lookup of displayClass+tier keys that have at least one Fleet hull.
 * Same displayClass + tier is the best Cargo signal for “fleet version available”.
 */
export function buildFleetAvailabilityIndex(
  ships: readonly FleetAvailabilityShip[],
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const ship of ships) {
    if (!isFleetShip(ship)) continue;
    const dc = classKey(ship.displayClass);
    if (!dc || ship.tier == null) continue;
    keys.add(`${dc}|${ship.tier}`);
  }
  return keys;
}

/**
 * True when a Fleet hull shares this ship’s displayClass + tier,
 * or when the ship itself is already a Fleet hull with a class+tier key.
 *
 * Gap: some C-store / Fleet pairs use different displayClass values
 * (e.g. Kurak T6 vs Fleet Mogh T6) and will not match.
 */
export function shipHasFleetVersion(
  ship: FleetAvailabilityShip,
  fleetKeys: ReadonlySet<string>,
): boolean {
  const dc = classKey(ship.displayClass);
  if (!dc || ship.tier == null) {
    // Fleet hull without class/tier still “is” a fleet version.
    return isFleetShip(ship);
  }
  return fleetKeys.has(`${dc}|${ship.tier}`);
}
