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

const APOSTROPHES = /[\u2018\u2019\u02BC\u0060\u00B4]/g;

/**
 * Wiki page titles that name the same hull as a catalog row but drop or
 * rename words the token key cannot recover safely.
 * Keys are wiki titles; values are decoded catalog `name`s.
 */
export const WIKI_SHIP_TITLE_ALIASES: Readonly<Record<string, string>> = {
  "Advanced Research Vessel (T6)": "Sutherland Advanced Research Vessel",
  "Ahgamas Multi-Mission Surveillance Vessel":
    "Gorn Ahgamas Multi-Mission Surveillance Vessel",
  "Hur'q Assembly Multi-Mission Science Vessel":
    "Hur'q Nekcrid Assembly Multi-Mission Science Vessel",
  "Ihgomas Multi-Mission Strategic Vessel":
    "Gorn Ihgomas Multi-Mission Strategic Vessel",
  "Khaimas Multi-Mission Reconnaissance Vessel":
    "Gorn Khaimas Multi-Mission Reconnaissance Vessel",
  "Kolasi Siege Destroyer": "Nausicaan Kolasi Siege Destroyer",
  "Legendary B'rel Bird-of-Prey": "Legendary B'rel Pilot Bird-of-Prey",
  "Ty'Gokor Command Battlecruiser": "Ty'Gokor Tactical Command Battlecruiser",
  "Vastam Command Battlecruiser": "Vastam Tactical Command Warbird",
  "Xindi-Insectoid Olaen Heavy Escort Carrier":
    "Xindi-Insectoid Olaen Heavy Strike Wing Escort",
};

/**
 * Order-insensitive key for wiki titles and catalog names.
 * Folds case and apostrophes, drops "-class" / a standalone "Class", and
 * treats a bare "Kelvin" as "Kelvin Timeline".
 */
export function shipNameMatchKey(value: string): string {
  let text = decodeHtmlEntities(value)
    .replace(APOSTROPHES, "'")
    .toLowerCase();
  text = text.replace(/-class\b/g, "");
  text = text.replace(/[-–—]/g, " ");
  text = text.replace(/[()[\]]/g, " ");
  const tokens = text
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token !== "class");
  const expanded: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    expanded.push(token);
    if (token === "kelvin" && tokens[index + 1] !== "timeline") {
      expanded.push("timeline");
    }
  }
  expanded.sort();
  return expanded.join(" ");
}

export type ShipNameIndex = {
  /** Decoded catalog names and display titles. Exact strings win. */
  exact: Map<string, number>;
  /** Normalized keys that resolve to exactly one hull (or one class family). */
  byKey: Map<string, number>;
  /** Normalized wiki titles that are explicit aliases of a catalog name. */
  aliasByKey: Map<string, number>;
};

function addClaim(
  claims: Map<string, ShipNameLookupRow[]>,
  key: string,
  ship: ShipNameLookupRow,
) {
  if (!key) return;
  const list = claims.get(key) ?? [];
  if (!list.some((row) => row.id === ship.id)) list.push(ship);
  claims.set(key, list);
}

function chooseShipForKey(
  ships: readonly ShipNameLookupRow[],
): ShipNameLookupRow | null {
  if (ships.length === 1) return ships[0]!;
  const classes = new Set(
    ships.map((ship) => (ship.displayClass ?? "").trim().toLowerCase()),
  );
  // T5/T6 hulls that share every other word but not a class stay unmatched.
  if (classes.size !== 1 || classes.has("")) return null;
  return ships.reduce((best, ship) => preferShipForAlias(best, ship));
}

export function buildShipNameIndex(
  ships: ShipNameLookupRow[],
): ShipNameIndex {
  const exact = buildShipNameIdMap(ships);
  const byId = new Map(ships.map((ship) => [ship.id, ship]));
  const claims = new Map<string, ShipNameLookupRow[]>();

  for (const ship of ships) {
    addClaim(claims, shipNameMatchKey(ship.name), ship);
    const title = buildShipDisplayTitle(ship);
    if (title) addClaim(claims, shipNameMatchKey(title), ship);
  }

  const byKey = new Map<string, number>();
  for (const [key, list] of claims) {
    const chosen = chooseShipForKey(list);
    if (chosen) byKey.set(key, chosen.id);
  }

  const aliasByKey = new Map<string, number>();
  for (const [wikiTitle, shipName] of Object.entries(WIKI_SHIP_TITLE_ALIASES)) {
    const id = exact.get(shipName);
    if (id == null || !byId.has(id)) continue;
    aliasByKey.set(shipNameMatchKey(wikiTitle), id);
  }

  return { exact, byKey, aliasByKey };
}

/** Resolve a wiki link target to a ship id. Exact catalog names win. */
export function lookupShipId(
  index: ShipNameIndex,
  target: string,
): number | undefined {
  const decoded = decodeHtmlEntities(target).trim();
  const exact = index.exact.get(decoded);
  if (exact != null) return exact;
  const key = shipNameMatchKey(decoded);
  return index.aliasByKey.get(key) ?? index.byKey.get(key);
}
