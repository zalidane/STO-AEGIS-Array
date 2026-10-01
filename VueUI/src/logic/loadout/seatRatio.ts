import { applyBoardPrefsToHullSlots } from "./boardPrefs";
import {
  buildBoffStations,
  boffSlotIds,
} from "./boffPowers";
import {
  buildCaptainTraitSlots,
  captainTraitBoardSlotIds,
} from "./captainTraits";
import { buildHullSlots, type HullSlotSource } from "./hullSlots";
import type { CollectionLoadout } from "./types";

export type LoadoutSeatRatioShip = HullSlotSource & {
  boffs?: string | null;
};

export type LoadoutSeatRatioCaptain = {
  faction?: string | null;
  race?: string | null;
};

export type LoadoutSeatRatio = {
  /** Seated fills that map to a known ship / captain / BOff socket. */
  filled: number;
  /** Open sockets on the builder for this loadout (hull + captain + BOff). */
  total: number;
};

/**
 * List-row `filled/total slots seated` for a saved loadout.
 *
 * Denominator is the full builder surface the loadout persists: hull equipment
 * (including ship-trait sockets once), captain trait board, and BOff ability
 * seats. Ship-trait ids are shared between hull and captain builders, so the
 * total uses a set union — not a naive length sum.
 */
export function loadoutSeatRatio(input: {
  loadout: Pick<
    CollectionLoadout,
    "slots" | "boardPrefs" | "boffSeatCareers"
  >;
  ship: LoadoutSeatRatioShip | null | undefined;
  captain?: LoadoutSeatRatioCaptain | null;
}): LoadoutSeatRatio {
  const { loadout, ship, captain } = input;
  if (!ship) {
    return { filled: loadout.slots.length, total: 0 };
  }

  const hullSlots = applyBoardPrefsToHullSlots(
    buildHullSlots(ship),
    loadout.boardPrefs,
    ship,
  );
  const openHullIds = hullSlots
    .filter((slot) => slot.locked !== true)
    .map((slot) => slot.id);
  const captainSlots = buildCaptainTraitSlots({
    faction: captain?.faction,
    race: captain?.race,
    hullTraitSlots: hullSlots.filter((slot) => slot.kind === "starshipTrait"),
  });
  const seatIds = new Set<string>([
    ...openHullIds,
    ...captainTraitBoardSlotIds(captainSlots),
    ...boffSlotIds(buildBoffStations(ship.boffs, loadout.boffSeatCareers)),
  ]);

  const filled = loadout.slots.filter((fill) => seatIds.has(fill.slotId)).length;
  return { filled, total: seatIds.size };
}
