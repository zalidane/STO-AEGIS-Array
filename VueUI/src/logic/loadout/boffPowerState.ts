import type { CollectionClock, CollectionState } from "@/logic/collection/types";
import { defaultCollectionClock } from "@/logic/collection/types";
import {
  BOFF_CATALOG_KIND,
  isPlayableCareer,
  powerFitsBoffSlot,
  stationForSlot,
  type BoffPlayableCareer,
  type BoffPowerSource,
  type BoffSeatCareerMap,
  type BoffStation,
} from "./boffPowers";
import { fillCatalogKind } from "./setBonus";
import type { CollectionLoadout, LoadoutSlotFill } from "./types";

export type BoffPowerEquipContext = {
  stations: ReadonlyArray<BoffStation>;
  powers: ReadonlyArray<BoffPowerSource>;
};

export type BoffPowerEquipFailure =
  | "no-character"
  | "unknown-loadout"
  | "unknown-slot"
  | "unknown-item"
  | "illegal-slot"
  | "equip-limit";

export type BoffPowerEquipResult =
  | { ok: true; loadout: CollectionLoadout }
  | { ok: false; reason: BoffPowerEquipFailure };

function replaceLoadout(
  state: CollectionState,
  loadoutId: string,
  update: (loadout: CollectionLoadout) => CollectionLoadout,
): CollectionState {
  if (!state.loadouts.some((loadout) => loadout.id === loadoutId)) {
    return state;
  }
  return {
    ...state,
    loadouts: state.loadouts.map((loadout) =>
      loadout.id === loadoutId ? update(loadout) : loadout,
    ),
  };
}

function activeLoadout(
  state: CollectionState,
  loadoutId: string,
): CollectionLoadout | null {
  const characterId = state.activeCharacterId;
  if (!characterId) return null;
  return (
    state.loadouts.find(
      (row) => row.id === loadoutId && row.characterId === characterId,
    ) ?? null
  );
}

function sameSkillOnStation(
  loadout: CollectionLoadout,
  station: BoffStation,
  itemId: number,
  exceptSlotId: string,
): boolean {
  const ids = new Set(station.slots.map((slot) => slot.id));
  return loadout.slots.some(
    (fill) =>
      ids.has(fill.slotId) &&
      fill.slotId !== exceptSlotId &&
      fill.itemId === itemId &&
      fillCatalogKind(fill) === BOFF_CATALOG_KIND,
  );
}

export function pruneBoffPowerFills(
  loadout: CollectionLoadout,
  stations: ReadonlyArray<BoffStation>,
  powers: ReadonlyArray<BoffPowerSource>,
): LoadoutSlotFill[] {
  const byId = new Map(powers.map((power) => [power.id, power]));
  return loadout.slots.filter((fill) => {
    if (fillCatalogKind(fill) !== BOFF_CATALOG_KIND) return true;
    const located = stationForSlot(stations, fill.slotId);
    if (!located) return false;
    const power = byId.get(fill.itemId);
    if (!power) return false;
    return powerFitsBoffSlot(power, located.slot, located.station);
  });
}

export function equipBoffPowerSlot(
  state: CollectionState,
  input: { loadoutId: string; slotId: string; itemId: number },
  context: BoffPowerEquipContext,
  clock: CollectionClock = defaultCollectionClock(),
): BoffPowerEquipResult {
  const loadout = activeLoadout(state, input.loadoutId);
  if (!state.activeCharacterId) return { ok: false, reason: "no-character" };
  if (!loadout) return { ok: false, reason: "unknown-loadout" };

  const located = stationForSlot(context.stations, input.slotId);
  if (!located) return { ok: false, reason: "unknown-slot" };

  const power = context.powers.find((row) => row.id === input.itemId);
  if (!power) return { ok: false, reason: "unknown-item" };

  if (!powerFitsBoffSlot(power, located.slot, located.station)) {
    return { ok: false, reason: "illegal-slot" };
  }

  const alreadyHere = loadout.slots.find(
    (fill) =>
      fill.slotId === input.slotId &&
      fill.itemId === input.itemId &&
      fillCatalogKind(fill) === BOFF_CATALOG_KIND,
  );
  if (alreadyHere) return { ok: true, loadout };

  if (sameSkillOnStation(loadout, located.station, input.itemId, input.slotId)) {
    return { ok: false, reason: "equip-limit" };
  }

  const nextLoadout: CollectionLoadout = {
    ...loadout,
    updatedAt: clock.now(),
    slots: [
      ...loadout.slots.filter((fill) => fill.slotId !== input.slotId),
      {
        slotId: input.slotId,
        itemId: input.itemId,
        catalogKind: BOFF_CATALOG_KIND,
      },
    ],
  };
  return { ok: true, loadout: nextLoadout };
}

export function setBoffSeatCareer(
  state: CollectionState,
  input: {
    loadoutId: string;
    stationIndex: number;
    career: BoffPlayableCareer | null;
  },
  context: BoffPowerEquipContext,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const loadout = activeLoadout(state, input.loadoutId);
  if (!loadout) return state;

  const careers: BoffSeatCareerMap = { ...(loadout.boffSeatCareers ?? {}) };
  const key = String(input.stationIndex);
  if (input.career && isPlayableCareer(input.career)) {
    careers[key] = input.career;
  } else {
    delete careers[key];
  }

  const nextStations = context.stations.map((station) =>
    station.index === input.stationIndex
      ? { ...station, careerChoice: input.career }
      : station,
  );
  const next: CollectionLoadout = {
    ...loadout,
    updatedAt: clock.now(),
    boffSeatCareers: Object.keys(careers).length > 0 ? careers : undefined,
    slots: pruneBoffPowerFills(
      { ...loadout, boffSeatCareers: careers },
      nextStations,
      context.powers,
    ),
  };
  return replaceLoadout(state, input.loadoutId, () => next);
}
