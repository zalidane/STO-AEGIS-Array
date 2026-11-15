/**
 * Cargo `cost` for some R&D promo hulls still lists only the character-bound
 * promotion pack. The wiki article says those hulls are also an account unlock
 * from a 29,500 Zen Mudd's Market choice pack (the same pair Amarie already
 * stores as `1;R&D / 29500;Zen`).
 *
 * Applied at import so a later Cargo extract cannot wipe the Zen path.
 * Rows that already mention Zen, or that are not in this list, are unchanged.
 */

import { decodeHtmlEntities } from "../utils/decodeHtmlEntities.js";

const R_AND_D_ONLY = /^1;R&D$/i;

/** Catalog names whose wiki page documents a 29,500 Zen Mudd's choice pack. */
export const MUDD_PROMO_ZEN_SHIP_NAMES = [
  "Inquiry Battlecruiser",
  "Krenim Annorax Science Dreadnought",
  "Sagan Command Cruiser",
  "Sh'vhal Temporal Science Spearhead",
  "Tzenkethi Tzen-tar Dreadnought Carrier",
] as const;

const MUDD_PROMO_ZEN_SHIPS = new Set<string>(MUDD_PROMO_ZEN_SHIP_NAMES);

export const MUDD_PROMO_ZEN_COST = "1;R&D / 29500;Zen";

type ShipCostRow = Record<string, unknown> & {
  name?: unknown;
  cost?: unknown;
};

export function applyMuddPromoZenCosts<T extends ShipCostRow>(
  rows: readonly T[],
): T[] {
  return rows.map((row) => {
    if (typeof row.name !== "string") return row;
    const name = decodeHtmlEntities(row.name);
    if (!MUDD_PROMO_ZEN_SHIPS.has(name)) return row;
    if (typeof row.cost !== "string") return row;
    const cost = decodeHtmlEntities(row.cost).trim();
    if (!R_AND_D_ONLY.test(cost)) return row;
    return { ...row, cost: MUDD_PROMO_ZEN_COST };
  });
}
