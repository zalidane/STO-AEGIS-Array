import type { CollectionState } from "@/logic/collection/types";
import {
  captainTraitOwnershipKey,
  traitFitsCaptainSlot,
  type CaptainTraitFill,
  type CaptainTraitSlot,
  type CaptainTraitSource,
} from "./captainTraits";
import type { CaptainCareer } from "@/logic/captain/identity";
import { applyLoadout } from "./state";
import type { CollectionLoadout } from "./types";

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
  | "unknown-loadout"
  | "unknown-slot"
  | "unknown-item"
  | "not-owned"
  | "illegal-slot"
  | "locked-slot"
  | "equip-limit";

export type CaptainTraitEquipResult =
  | { ok: true; loadout: CollectionLoadout }
  | { ok: false; reason: CaptainTraitEquipFailure };

/**
 * Seat a space-trait board fill on the active loadout (#16).
 * Ownership stays on the captain; seating is per build.
 */
export function equipCaptainTraitSlot(
  state: CollectionState,
  input: {
    loadoutId: string;
    slotId: string;
    itemId: number;
    catalogKind: CaptainTraitFill["catalogKind"];
  },
  context: CaptainTraitEquipContext,
): CaptainTraitEquipResult {
  const characterId = state.activeCharacterId;
  if (!characterId) return { ok: false, reason: "no-character" };

  const loadout = state.loadouts.find(
    (row) => row.id === input.loadoutId && row.characterId === characterId,
  );
  if (!loadout) return { ok: false, reason: "unknown-loadout" };

  const slot = context.slots.find((row) => row.id === input.slotId);
  if (!slot || slot.storage !== "loadout") {
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

  const alreadyHere = loadout.slots.find(
    (fill) =>
      fill.slotId === input.slotId &&
      fill.itemId === input.itemId &&
      fill.catalogKind === input.catalogKind,
  );
  if (alreadyHere) return { ok: true, loadout };

  const copies = loadout.slots.filter(
    (fill) =>
      fill.itemId === input.itemId &&
      fill.catalogKind === input.catalogKind &&
      fill.slotId !== input.slotId,
  ).length;
  if (copies >= 1) return { ok: false, reason: "equip-limit" };

  return {
    ok: true,
    loadout: {
      ...loadout,
      slots: [
        ...loadout.slots.filter((fill) => fill.slotId !== input.slotId),
        {
          slotId: input.slotId,
          itemId: input.itemId,
          catalogKind: input.catalogKind,
        },
      ],
    },
  };
}

export function applyCaptainTraitLoadout(
  state: CollectionState,
  loadout: CollectionLoadout,
): CollectionState {
  return applyLoadout(state, loadout);
}

export function unequipCaptainTraitSlot(
  state: CollectionState,
  input: { loadoutId: string; slotId: string },
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;
  const loadout = state.loadouts.find(
    (row) => row.id === input.loadoutId && row.characterId === characterId,
  );
  if (!loadout) return state;
  const slots = loadout.slots.filter((fill) => fill.slotId !== input.slotId);
  if (slots.length === loadout.slots.length) return state;
  return applyLoadout(state, { ...loadout, slots });
}

/** Remove a trait from every loadout for this captain (and legacy character board). */
export function stripTraitFromCharacterBoard(
  state: CollectionState,
  characterId: string,
  itemId: number,
  catalogKind: CaptainTraitFill["catalogKind"],
): CollectionState {
  const characters = state.characters.map((character) => {
    if (character.id !== characterId) return character;
    const fills = (character.traitSlots ?? []).filter(
      (fill) => !(fill.itemId === itemId && fill.catalogKind === catalogKind),
    );
    if (fills.length === (character.traitSlots ?? []).length) return character;
    return { ...character, traitSlots: fills };
  });
  const loadouts = state.loadouts.map((loadout) => {
    if (loadout.characterId !== characterId) return loadout;
    const slots = loadout.slots.filter(
      (fill) =>
        !(fill.itemId === itemId && fill.catalogKind === catalogKind),
    );
    if (slots.length === loadout.slots.length) return loadout;
    return { ...loadout, slots };
  });
  return { ...state, characters, loadouts };
}
