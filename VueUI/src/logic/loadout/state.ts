import type { CollectionClock, CollectionState } from "@/logic/collection/types";
import { defaultCollectionClock } from "@/logic/collection/types";
import {
  copiesAllowed,
  countCopiesInLoadout,
  itemFitsHullSlot,
} from "./setBonus";
import type {
  CollectionLoadout,
  EquipResult,
  LoadoutEquipContext,
  LoadoutSlotFill,
} from "./types";

function defaultLoadoutName(
  existing: ReadonlyArray<CollectionLoadout>,
  shipId: number,
  characterId: string,
): string {
  const count = existing.filter(
    (loadout) =>
      loadout.characterId === characterId && loadout.shipId === shipId,
  ).length;
  return count === 0 ? "Loadout 1" : `Loadout ${count + 1}`;
}

export function loadoutsForCharacter(
  state: CollectionState,
  characterId: string | null,
  shipId?: number,
): CollectionLoadout[] {
  if (!characterId) return [];
  return state.loadouts.filter((loadout) => {
    if (loadout.characterId !== characterId) return false;
    if (shipId != null && loadout.shipId !== shipId) return false;
    return true;
  });
}

export function getLoadout(
  state: CollectionState,
  loadoutId: string,
): CollectionLoadout | null {
  return state.loadouts.find((loadout) => loadout.id === loadoutId) ?? null;
}

export function createLoadout(
  state: CollectionState,
  input: { shipId: number; name?: string },
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;

  const name = input.name?.trim() || defaultLoadoutName(
    state.loadouts,
    input.shipId,
    characterId,
  );
  const now = clock.now();
  const loadout: CollectionLoadout = {
    id: clock.id(),
    characterId,
    shipId: input.shipId,
    name,
    createdAt: now,
    updatedAt: now,
    slots: [],
  };

  return {
    ...state,
    loadouts: [...state.loadouts, loadout],
  };
}

export function renameLoadout(
  state: CollectionState,
  loadoutId: string,
  name: string,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  return replaceLoadout(state, loadoutId, (loadout) => ({
    ...loadout,
    name: trimmed,
    updatedAt: clock.now(),
  }));
}

export function deleteLoadout(
  state: CollectionState,
  loadoutId: string,
): CollectionState {
  return {
    ...state,
    loadouts: state.loadouts.filter((loadout) => loadout.id !== loadoutId),
  };
}

export function unequipLoadoutSlot(
  state: CollectionState,
  input: { loadoutId: string; slotId: string },
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  return replaceLoadout(state, input.loadoutId, (loadout) => ({
    ...loadout,
    updatedAt: clock.now(),
    slots: loadout.slots.filter((fill) => fill.slotId !== input.slotId),
  }));
}

export function stripItemFromCharacterLoadouts(
  state: CollectionState,
  characterId: string,
  itemId: number,
): CollectionState {
  return {
    ...state,
    loadouts: state.loadouts.map((loadout) => {
      if (loadout.characterId !== characterId) return loadout;
      const slots = loadout.slots.filter((fill) => fill.itemId !== itemId);
      if (slots.length === loadout.slots.length) return loadout;
      return { ...loadout, slots };
    }),
  };
}

export function stripLoadoutsForCharacter(
  state: CollectionState,
  characterId: string,
): CollectionState {
  return {
    ...state,
    loadouts: state.loadouts.filter(
      (loadout) => loadout.characterId !== characterId,
    ),
  };
}

export function equipLoadoutSlot(
  state: CollectionState,
  input: { loadoutId: string; slotId: string; itemId: number },
  context: LoadoutEquipContext,
  clock: CollectionClock = defaultCollectionClock(),
): EquipResult {
  const characterId = state.activeCharacterId;
  if (!characterId) return { ok: false, reason: "no-character" };

  const loadout = state.loadouts.find(
    (row) => row.id === input.loadoutId && row.characterId === characterId,
  );
  if (!loadout) return { ok: false, reason: "unknown-loadout" };

  const slot = context.hullSlots.find((row) => row.id === input.slotId);
  if (!slot) return { ok: false, reason: "unknown-slot" };

  const item = context.items.find((row) => row.id === input.itemId);
  if (!item) return { ok: false, reason: "unknown-item" };
  if (!context.ownedItemIds.has(item.id)) {
    return { ok: false, reason: "not-owned" };
  }
  if (!itemFitsHullSlot(item, slot.kind)) {
    return { ok: false, reason: "illegal-slot" };
  }

  const alreadyHere = loadout.slots.find(
    (fill) => fill.slotId === input.slotId && fill.itemId === input.itemId,
  );
  if (alreadyHere) {
    return { ok: true, loadout };
  }

  const copies = countCopiesInLoadout(loadout, item.id, input.slotId);
  if (copies >= copiesAllowed(item)) {
    return { ok: false, reason: "equip-limit" };
  }

  const nextSlots: LoadoutSlotFill[] = [
    ...loadout.slots.filter((fill) => fill.slotId !== input.slotId),
    { slotId: input.slotId, itemId: item.id },
  ];
  const nextLoadout: CollectionLoadout = {
    ...loadout,
    updatedAt: clock.now(),
    slots: nextSlots,
  };

  return {
    ok: true,
    loadout: nextLoadout,
  };
}

export function applyLoadout(
  state: CollectionState,
  loadout: CollectionLoadout,
): CollectionState {
  return {
    ...state,
    loadouts: state.loadouts.map((row) =>
      row.id === loadout.id ? loadout : row,
    ),
  };
}

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

export function filledSlotMap(
  loadout: CollectionLoadout | null | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!loadout) return map;
  for (const fill of loadout.slots) {
    map.set(fill.slotId, fill.itemId);
  }
  return map;
}

export function orphanedFills(
  loadout: CollectionLoadout,
  hullSlotIds: ReadonlySet<string>,
  knownItemIds: ReadonlySet<number>,
): LoadoutSlotFill[] {
  return loadout.slots.filter(
    (fill) => !hullSlotIds.has(fill.slotId) || !knownItemIds.has(fill.itemId),
  );
}
