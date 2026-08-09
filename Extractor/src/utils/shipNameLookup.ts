import { decodeHtmlEntities } from "./decodeHtmlEntities";

export type ShipNameLookupRow = {
  id: number;
  name: string;
  displayPrefix?: string | null;
  displayClass?: string | null;
  displayType?: string | null;
  tier?: number | null;
};

/** Wiki-style title: displayPrefix + displayClass + displayType. */
export function buildShipDisplayTitle(
  ship: Pick<
    ShipNameLookupRow,
    "displayPrefix" | "displayClass" | "displayType"
  >,
): string | null {
  const parts = [ship.displayPrefix, ship.displayClass, ship.displayType]
    .map((part) =>
      part == null ? "" : decodeHtmlEntities(String(part).trim()),
    )
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : null;
}

function isFleetName(name: string): boolean {
  return /^fleet\s/i.test(decodeHtmlEntities(name));
}

/** Prefer non-Fleet, then higher tier, when two ships share a display title. */
export function preferShipForAlias(
  current: ShipNameLookupRow,
  candidate: ShipNameLookupRow,
): ShipNameLookupRow {
  const currentFleet = isFleetName(current.name);
  const candidateFleet = isFleetName(candidate.name);
  if (currentFleet !== candidateFleet) {
    return candidateFleet ? current : candidate;
  }

  const currentTier = current.tier ?? -1;
  const candidateTier = candidate.tier ?? -1;
  if (candidateTier !== currentTier) {
    return candidateTier > currentTier ? candidate : current;
  }

  return current;
}

/**
 * Map decoded ship names and display titles → ship ids for wiki link resolution.
 * Exact names always win over display-title aliases.
 */
export function buildShipNameIdMap(
  ships: ShipNameLookupRow[],
): Map<string, number> {
  const byName = new Map<string, number>();
  const byDisplayTitle = new Map<string, ShipNameLookupRow>();

  for (const ship of ships) {
    byName.set(decodeHtmlEntities(ship.name), ship.id);

    const title = buildShipDisplayTitle(ship);
    if (!title) continue;

    const existing = byDisplayTitle.get(title);
    byDisplayTitle.set(
      title,
      existing ? preferShipForAlias(existing, ship) : ship,
    );
  }

  const map = new Map<string, number>();
  for (const [title, ship] of byDisplayTitle) {
    // Exact names take precedence when they collide with a display title.
    if (!byName.has(title)) {
      map.set(title, ship.id);
    }
  }
  for (const [name, id] of byName) {
    map.set(name, id);
  }
  return map;
}
