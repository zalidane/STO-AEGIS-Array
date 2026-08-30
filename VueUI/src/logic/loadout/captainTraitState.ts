import type { CollectionState } from "@/logic/collection/types";
import {
  captainTraitOwnershipKey,
  traitFitsCaptainSlot,
  type CaptainTraitFill,
  type CaptainTraitSlot,
  type CaptainTraitSource,
} from "./captainTraits";
import type { CaptainCareer } from "@/logic/captain/identity";

export type CaptainTraitEquipContext = {
  slots: ReadonlyArray<CaptainTraitSlot>;
  traits: ReadonlyArray<CaptainTraitSource>;
  ownedKeys: ReadonlySet<string>;
  requireOwned?: boolean;
  career?: CaptainCareer | null;
  raceLabel?: string | null;
};

export type CaptainTraitEquipFailure =
  | "no-character"
  | "unknown-slot"
  | "unknown-item"
  | "not-owned"
  | "illegal-slot"
  | "locked-slot"
  | "equip-limit";

export type CaptainTraitEquipResult =
  | { ok: true; fills: CaptainTraitFill[] }
  | { ok: false; reason: CaptainTraitEquipFailure };

function characterFills(state: CollectionState, characterId: string): CaptainTraitFill[] {
  return (
    state.characters.find((character) => character.id === characterId)
      ?.traitSlots ?? []
  );
}

function replaceCharacterFills(
  state: CollectionState,
  characterId: string,
  fills: CaptainTraitFill[],
): CollectionState {
  return {
    ...state,
    characters: state.characters.map((character) =>
      character.id === characterId ? { ...character, traitSlots: fills } : character,
    ),
  };
}

export function equipCaptainTraitSlot(
  state: CollectionState,
  input: { slotId: string; itemId: number; catalogKind: CaptainTraitFill["catalogKind"] },
  context: CaptainTraitEquipContext,
): CaptainTraitEquipResult {
  const characterId = state.activeCharacterId;
  if (!characterId) return { ok: false, reason: "no-character" };

  const slot = context.slots.find((row) => row.id === input.slotId);
  if (!slot || slot.storage !== "character") {
    return { ok: false, reason: "unknown-slot" };
  }
  if (slot.locked) return { ok: false, reason: "locked-slot" };

  const trait = context.traits.find(
    (row) =>
      row.id === input.itemId &&
      (row.catalogKind ?? "trait") === input.catalogKind,
  );
  if (!trait) return { ok: false, reason: "unknown-item" };

  const requireOwned = context.requireOwned !== false;
  if (
    requireOwned &&
    !context.ownedKeys.has(
      captainTraitOwnershipKey(input.catalogKind, input.itemId),
    )
  ) {
    return { ok: false, reason: "not-owned" };
  }
  if (
    !traitFitsCaptainSlot(trait, slot, {
      career: context.career,
      raceLabel: context.raceLabel,
    })
  ) {
    return { ok: false, reason: "illegal-slot" };
  }

  const current = characterFills(state, characterId);
  const alreadyHere = current.find(
    (fill) =>
      fill.slotId === input.slotId &&
      fill.itemId === input.itemId &&
      fill.catalogKind === input.catalogKind,
  );
  if (alreadyHere) return { ok: true, fills: current };

  const copies = current.filter(
    (fill) =>
      fill.itemId === input.itemId &&
      fill.catalogKind === input.catalogKind &&
      fill.slotId !== input.slotId,
  ).length;
  if (copies >= 1) return { ok: false, reason: "equip-limit" };

  const fills = [
    ...current.filter((fill) => fill.slotId !== input.slotId),
    {
      slotId: input.slotId,
      itemId: input.itemId,
      catalogKind: input.catalogKind,
    },
  ];
  return { ok: true, fills };
}

export function applyCaptainTraitFills(
  state: CollectionState,
  fills: CaptainTraitFill[],
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;
  return replaceCharacterFills(state, characterId, fills);
}

export function unequipCaptainTraitSlot(
  state: CollectionState,
  slotId: string,
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;
  const current = characterFills(state, characterId);
  const fills = current.filter((fill) => fill.slotId !== slotId);
  if (fills.length === current.length) return state;
  return replaceCharacterFills(state, characterId, fills);
}

export function stripTraitFromCharacterBoard(
  state: CollectionState,
  characterId: string,
  itemId: number,
  catalogKind: CaptainTraitFill["catalogKind"],
): CollectionState {
  const current = characterFills(state, characterId);
  const fills = current.filter(
    (fill) => !(fill.itemId === itemId && fill.catalogKind === catalogKind),
  );
  if (fills.length === current.length) return state;
  return replaceCharacterFills(state, characterId, fills);
}
