import type { CollectionClock, CollectionState } from "@/logic/collection/types";
import { defaultCollectionClock } from "@/logic/collection/types";
import {
  copiesAllowed,
  countCopiesInLoadout,
  fillCatalogKind,
  itemFitsHullSlot,
  loadoutOwnershipKey,
} from "./setBonus";
import { seatedSuffixModifiers, trimModifiersForQuality } from "./slotModifiers";
import { inheritModsFromPreviousSameKind, modsForNewFill } from "./slotQuality";
import type { CombatParseSummary } from "@/logic/combatlog/types";
import type {
  CollectionLoadout,
  EquipResult,
  LoadoutCatalogKind,
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
  return count === 0 ? "Build 1" : `Build ${count + 1}`;
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

/** Copy a published snapshot onto this captain. Always mints a new local UUID. */
export function importSharedLoadout(
  state: CollectionState,
  input: {
    shipId: number;
    name?: string;
    slots: LoadoutSlotFill[];
    boffSeatCareers?: CollectionLoadout["boffSeatCareers"];
  },
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
    slots: input.slots.map((fill) => ({ ...fill })),
    ...(input.boffSeatCareers
      ? { boffSeatCareers: { ...input.boffSeatCareers } }
      : {}),
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

export function attachCombatParse(
  state: CollectionState,
  loadoutId: string,
  parse: CombatParseSummary,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  return replaceLoadout(state, loadoutId, (loadout) => ({
    ...loadout,
    updatedAt: clock.now(),
    combatParse: parse,
  }));
}

export function clearCombatParse(
  state: CollectionState,
  loadoutId: string,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  return replaceLoadout(state, loadoutId, (loadout) => {
    const { combatParse: _dropped, ...rest } = loadout;
    return { ...rest, updatedAt: clock.now() };
  });
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
  catalogKind: LoadoutCatalogKind = "item",
): CollectionState {
  return {
    ...state,
    loadouts: state.loadouts.map((loadout) => {
      if (loadout.characterId !== characterId) return loadout;
      const slots = loadout.slots.filter(
        (fill) =>
          !(fill.itemId === itemId && fillCatalogKind(fill) === catalogKind),
      );
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
  input: { loadoutId: string; slotId: string; itemId: number; catalogKind?: LoadoutCatalogKind },
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

  const item = context.items.find(
    (row) =>
      row.id === input.itemId &&
      (row.catalogKind ?? "item") === (input.catalogKind ?? "item"),
  );
  if (!item) return { ok: false, reason: "unknown-item" };
  const requireOwned = context.requireOwned !== false;
  if (
    requireOwned &&
    !context.ownedKeys.has(loadoutOwnershipKey(item.catalogKind, item.id))
  ) {
    return { ok: false, reason: "not-owned" };
  }
  if (!itemFitsHullSlot(item, slot.kind)) {
    return { ok: false, reason: "illegal-slot" };
  }

  const catalogKind = item.catalogKind ?? "item";
  const alreadyHere = loadout.slots.find(
    (fill) =>
      fill.slotId === input.slotId &&
      fill.itemId === input.itemId &&
      fillCatalogKind(fill) === catalogKind,
  );
  if (alreadyHere) {
    return { ok: true, loadout };
  }

  const copies = countCopiesInLoadout(
    loadout,
    item.id,
    input.slotId,
    catalogKind,
  );
  if (copies >= copiesAllowed(item)) {
    return { ok: false, reason: "equip-limit" };
  }

  const existing = loadout.slots.find((fill) => fill.slotId === input.slotId);
  const mods = modsForNewFill({
    kind: slot.kind,
    catalogKind,
    existing,
    inherited: inheritModsFromPreviousSameKind(
      context.hullSlots,
      loadout.slots,
      slot,
    ),
    rarity: item.rarity,
    itemType: item.type,
  });
  const modifiers = seatedSuffixModifiers({
    kind: slot.kind,
    itemType: item.type,
    itemName: item.name,
    quality: mods.quality,
    selected: mods.modifiers,
    catalog: context.modifiers,
  });
  const nextSlots: LoadoutSlotFill[] = [
    ...loadout.slots.filter((fill) => fill.slotId !== input.slotId),
    {
      slotId: input.slotId,
      itemId: item.id,
      catalogKind,
      ...(mods.quality ? { quality: mods.quality } : {}),
      ...(mods.mark ? { mark: mods.mark } : {}),
      ...(modifiers?.length ? { modifiers } : {}),
    },
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

export function updateLoadoutSlotMods(
  state: CollectionState,
  input: {
    loadoutId: string;
    slotId: string;
    quality?: string;
    mark?: string;
    modifiers?: string[];
  },
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  return replaceLoadout(state, input.loadoutId, (loadout) => {
    const fill = loadout.slots.find((row) => row.slotId === input.slotId);
    if (!fill) return loadout;
    return {
      ...loadout,
      updatedAt: clock.now(),
      slots: loadout.slots.map((row) => {
        if (row.slotId !== input.slotId) return row;
        const quality = input.quality ?? row.quality;
        const sourceModifiers =
          input.modifiers !== undefined ? input.modifiers : row.modifiers;
        const modifiers =
          input.modifiers !== undefined || input.quality != null
            ? trimModifiersForQuality(sourceModifiers, quality)
            : row.modifiers;
        const { modifiers: _dropped, ...rest } = row;
        return {
          ...rest,
          ...(input.quality != null ? { quality: input.quality } : {}),
          ...(input.mark != null ? { mark: input.mark } : {}),
          ...(modifiers?.length ? { modifiers } : {}),
        };
      }),
    };
  });
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

export function fillForSlot(
  loadout: CollectionLoadout | null | undefined,
  slotId: string,
): LoadoutSlotFill | null {
  if (!loadout) return null;
  return loadout.slots.find((fill) => fill.slotId === slotId) ?? null;
}

export function orphanedFills(
  loadout: CollectionLoadout,
  hullSlotIds: ReadonlySet<string>,
  ownedKeys: ReadonlySet<string>,
): LoadoutSlotFill[] {
  return loadout.slots.filter((fill) => {
    if (!hullSlotIds.has(fill.slotId)) return true;
    if (fillCatalogKind(fill) === "traySkill") return false;
    return !ownedKeys.has(loadoutOwnershipKey(fillCatalogKind(fill), fill.itemId));
  });
}
