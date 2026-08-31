import type {
  CatalogKind,
  CollectionCharacter,
  CollectionClock,
  CollectionEntry,
  CollectionState,
  CollectionStatus,
  CreateCharacterInput,
} from "./types";
import { createEmptyCollectionState, defaultCollectionClock } from "./types";
import type { BindScope } from "./types";
import { isCombatParseSummary } from "@/logic/combatlog/parseLog";
import type { CollectionLoadout } from "@/logic/loadout/types";
import { careerById, factionById, raceById } from "@/logic/captain/identity";
import {
  buildCaptainTraitSlots,
  pruneCaptainTraitFills,
  type CaptainTraitFill,
} from "@/logic/loadout/captainTraits";
import { stripTraitFromCharacterBoard } from "@/logic/loadout/captainTraitState";
import {
  stripItemFromCharacterLoadouts,
  stripLoadoutsForCharacter,
} from "@/logic/loadout/state";

function characterName(
  state: CollectionState,
  characterId: string,
): string {
  return (
    state.characters.find((character) => character.id === characterId)?.name ??
    "Unknown captain"
  );
}

export function getActiveCharacter(
  state: CollectionState,
): CollectionCharacter | null {
  if (!state.activeCharacterId) return null;
  return (
    state.characters.find(
      (character) => character.id === state.activeCharacterId,
    ) ?? null
  );
}

function parseCreateInput(
  input: string | CreateCharacterInput,
): { name: string; identity?: Omit<CreateCharacterInput, "name"> } {
  if (typeof input === "string") {
    return { name: input.trim() };
  }
  return {
    name: input.name.trim(),
    identity: {
      career: input.career,
      faction: input.faction,
      race: input.race,
    },
  };
}

export function createCharacter(
  state: CollectionState,
  input: string | CreateCharacterInput,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const parsed = parseCreateInput(input);
  if (!parsed.name) return state;

  const character: CollectionCharacter = {
    id: clock.id(),
    name: parsed.name,
    createdAt: clock.now(),
    ...(parsed.identity ?? {}),
    traitSlots: [],
  };

  return {
    ...state,
    characters: [...state.characters, character],
    activeCharacterId: character.id,
  };
}

export function renameCharacter(
  state: CollectionState,
  characterId: string,
  name: string,
): CollectionState {
  return updateCharacter(state, characterId, { name });
}

export function updateCharacter(
  state: CollectionState,
  characterId: string,
  patch: {
    name?: string;
    career?: CollectionCharacter["career"];
    faction?: string;
    race?: string;
  },
): CollectionState {
  if (!state.characters.some((character) => character.id === characterId)) {
    return state;
  }
  const nextName = patch.name != null ? patch.name.trim() : undefined;
  if (patch.name != null && !nextName) return state;

  return {
    ...state,
    characters: state.characters.map((character) => {
      if (character.id !== characterId) return character;
      const next: CollectionCharacter = {
        ...character,
        ...(nextName != null ? { name: nextName } : {}),
        ...(patch.career !== undefined ? { career: patch.career } : {}),
        ...(patch.faction !== undefined ? { faction: patch.faction } : {}),
        ...(patch.race !== undefined ? { race: patch.race } : {}),
      };
      const slots = buildCaptainTraitSlots({
        faction: next.faction,
        race: next.race,
      });
      return {
        ...next,
        traitSlots: pruneCaptainTraitFills(next.traitSlots, slots),
      };
    }),
  };
}

export function deleteCharacter(
  state: CollectionState,
  characterId: string,
): CollectionState {
  const characters = state.characters.filter(
    (character) => character.id !== characterId,
  );
  const entries = state.entries.filter(
    (entry) => entry.characterId !== characterId,
  );
  const withoutLoadouts = stripLoadoutsForCharacter(
    { ...state, characters, entries },
    characterId,
  );
  const activeCharacterId =
    state.activeCharacterId === characterId
      ? (characters[0]?.id ?? null)
      : state.activeCharacterId;

  return {
    ...withoutLoadouts,
    characters,
    entries,
    activeCharacterId,
  };
}

export function setActiveCharacter(
  state: CollectionState,
  characterId: string | null,
): CollectionState {
  if (characterId != null) {
    const exists = state.characters.some(
      (character) => character.id === characterId,
    );
    if (!exists) return state;
  }
  return { ...state, activeCharacterId: characterId };
}

export function ownedCopyCount(
  state: CollectionState,
  input: { kind: CatalogKind; catalogId: number },
): number {
  const characterId = state.activeCharacterId;
  if (!characterId) return 0;
  return state.entries.filter(
    (entry) =>
      entry.characterId === characterId &&
      entry.kind === input.kind &&
      entry.catalogId === input.catalogId,
  ).length;
}

export function collectItem(
  state: CollectionState,
  input: {
    kind: CatalogKind;
    catalogId: number;
    bind?: BindScope;
    allowDuplicate?: boolean;
  },
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;

  const already = ownedCopyCount(state, input) > 0;
  const canDuplicate = Boolean(input.allowDuplicate) && input.kind === "item";
  if (already && !canDuplicate) return state;

  const entry: CollectionEntry = {
    id: clock.id(),
    characterId,
    kind: input.kind,
    catalogId: input.catalogId,
    collectedAt: clock.now(),
    ...(input.bind ? { bind: input.bind } : {}),
  };

  return {
    ...state,
    entries: [...state.entries, entry],
  };
}

export function collectMany(
  state: CollectionState,
  items: ReadonlyArray<{
    kind: CatalogKind;
    catalogId: number;
    bind?: BindScope;
    allowDuplicate?: boolean;
  }>,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  return items.reduce(
    (next, item) => collectItem(next, item, clock),
    state,
  );
}

export function setEntryBind(
  state: CollectionState,
  input: { kind: CatalogKind; catalogId: number; bind: BindScope },
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;

  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.characterId === characterId &&
      entry.kind === input.kind &&
      entry.catalogId === input.catalogId
        ? { ...entry, bind: input.bind }
        : entry,
    ),
  };
}

export function entryBindForActive(
  state: CollectionState,
  input: { kind: CatalogKind; catalogId: number },
): BindScope | undefined {
  const characterId = state.activeCharacterId;
  if (!characterId) return undefined;
  return state.entries.find(
    (entry) =>
      entry.characterId === characterId &&
      entry.kind === input.kind &&
      entry.catalogId === input.catalogId,
  )?.bind;
}

export function resolvedBindForEntry(
  entry: CollectionEntry,
  catalogBind: BindScope,
): BindScope {
  return entry.bind ?? catalogBind;
}

export function uncollectItem(
  state: CollectionState,
  input: { kind: CatalogKind; catalogId: number },
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;

  let lastIndex = -1;
  for (let i = state.entries.length - 1; i >= 0; i -= 1) {
    const entry = state.entries[i];
    if (!entry) continue;
    if (
      entry.characterId === characterId &&
      entry.kind === input.kind &&
      entry.catalogId === input.catalogId
    ) {
      lastIndex = i;
      break;
    }
  }
  if (lastIndex < 0) return state;

  const next = {
    ...state,
    entries: state.entries.filter((_, index) => index !== lastIndex),
  };
  if (ownedCopyCount(next, input) > 0) return next;

  if (input.kind === "trait") {
    return stripTraitFromCharacterBoard(
      next,
      characterId,
      input.catalogId,
      "trait",
    );
  }
  if (input.kind !== "item" && input.kind !== "starshipTrait") return next;
  const stripped = stripItemFromCharacterLoadouts(
    next,
    characterId,
    input.catalogId,
    input.kind === "starshipTrait" ? "starshipTrait" : "item",
  );
  if (input.kind !== "starshipTrait") return stripped;
  return stripTraitFromCharacterBoard(
    stripped,
    characterId,
    input.catalogId,
    "starshipTrait",
  );
}

export function uncollectMany(
  state: CollectionState,
  items: ReadonlyArray<{ kind: CatalogKind; catalogId: number }>,
): CollectionState {
  return items.reduce(
    (next, item) => uncollectItem(next, item),
    state,
  );
}

export function collectionStatus(
  state: CollectionState,
  input: { kind: CatalogKind; catalogId: number; bind: BindScope },
): CollectionStatus {
  const matches = state.entries.filter(
    (entry) =>
      entry.kind === input.kind && entry.catalogId === input.catalogId,
  );
  const activeId = state.activeCharacterId;
  const ownedByActive = matches.some(
    (entry) => entry.characterId === activeId,
  );

  const otherAccountCopies = matches
    .filter((entry) => entry.characterId !== activeId)
    .filter((entry) => (entry.bind ?? input.bind) === "account")
    .map((entry) => ({
      characterId: entry.characterId,
      characterName: characterName(state, entry.characterId),
      isActive: false,
    }));

  return { ownedByActive, otherAccountCopies };
}

/** Active captain's own entries plus BtA copies from other captains. */
export function visibleEntriesForActiveCharacter(
  state: CollectionState,
  bindForEntry: (entry: CollectionEntry) => BindScope,
): CollectionEntry[] {
  const activeId = state.activeCharacterId;
  if (!activeId) return [];

  return state.entries.filter((entry) => {
    if (entry.characterId === activeId) return true;
    return bindForEntry(entry) === "account";
  });
}

export function visibleCatalogIds(
  state: CollectionState,
  kind: CatalogKind,
  bindForEntry: (entry: CollectionEntry) => BindScope,
): Set<number> {
  return new Set(
    visibleEntriesForActiveCharacter(state, bindForEntry)
      .filter((entry) => entry.kind === kind)
      .map((entry) => entry.catalogId),
  );
}

export function hydrateCollectionState(
  raw: unknown,
): CollectionState {
  if (!raw || typeof raw !== "object") {
    return createEmptyCollectionState();
  }
  const value = raw as {
    version?: unknown;
    activeCharacterId?: unknown;
    characters?: unknown;
    entries?: unknown;
    loadouts?: unknown;
  };
  const version = value.version;
  if (
    (version !== 1 && version !== 2) ||
    !Array.isArray(value.characters) ||
    !Array.isArray(value.entries)
  ) {
    return createEmptyCollectionState();
  }
  return {
    version: 2,
    activeCharacterId:
      typeof value.activeCharacterId === "string" ||
      value.activeCharacterId === null
        ? value.activeCharacterId
        : null,
    characters: Array.isArray(value.characters)
      ? value.characters.filter(isCharacter)
      : [],
    entries: Array.isArray(value.entries) ? value.entries.filter(isEntry) : [],
    loadouts:
      version === 2 && Array.isArray(value.loadouts)
        ? value.loadouts.filter(isLoadout).map(sanitizeLoadoutParse)
        : [],
  };
}

function isTraitFill(value: unknown): value is CaptainTraitFill {
  if (!value || typeof value !== "object") return false;
  const fill = value as CaptainTraitFill;
  return (
    typeof fill.slotId === "string" &&
    typeof fill.itemId === "number" &&
    (fill.catalogKind === "trait" || fill.catalogKind === "starshipTrait")
  );
}

function isCharacter(value: unknown): value is CollectionCharacter {
  if (!value || typeof value !== "object") return false;
  const character = value as CollectionCharacter;
  if (
    typeof character.id !== "string" ||
    typeof character.name !== "string" ||
    typeof character.createdAt !== "string"
  ) {
    return false;
  }
  if (character.career != null && careerById(character.career) == null) {
    return false;
  }
  if (character.faction != null && factionById(character.faction) == null) {
    return false;
  }
  if (
    character.race != null &&
    raceById(character.faction, character.race) == null &&
    raceById(undefined, character.race) == null
  ) {
    return false;
  }
  if (character.traitSlots != null && !Array.isArray(character.traitSlots)) {
    return false;
  }
  if (character.traitSlots && !character.traitSlots.every(isTraitFill)) {
    return false;
  }
  return true;
}

function isLoadout(value: unknown): value is CollectionLoadout {
  if (!value || typeof value !== "object") return false;
  const loadout = value as CollectionLoadout;
  return (
    typeof loadout.id === "string" &&
    typeof loadout.characterId === "string" &&
    typeof loadout.shipId === "number" &&
    typeof loadout.name === "string" &&
    typeof loadout.createdAt === "string" &&
    typeof loadout.updatedAt === "string" &&
    Array.isArray(loadout.slots) &&
    loadout.slots.every(isSlotFill)
  );
}

function sanitizeLoadoutParse(loadout: CollectionLoadout): CollectionLoadout {
  if (loadout.combatParse == null) return loadout;
  if (isCombatParseSummary(loadout.combatParse)) return loadout;
  const { combatParse: _dropped, ...rest } = loadout;
  return rest;
}

function isSlotFill(value: unknown): value is CollectionLoadout["slots"][number] {
  if (!value || typeof value !== "object") return false;
  const fill = value as CollectionLoadout["slots"][number];
  if (typeof fill.slotId !== "string" || typeof fill.itemId !== "number") {
    return false;
  }
  if (fill.quality != null && typeof fill.quality !== "string") return false;
  if (fill.mark != null && typeof fill.mark !== "string") return false;
  return true;
}

function isEntry(value: unknown): value is CollectionEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as CollectionEntry;
  return (
    typeof entry.id === "string" &&
    typeof entry.characterId === "string" &&
    typeof entry.kind === "string" &&
    typeof entry.catalogId === "number" &&
    typeof entry.collectedAt === "string" &&
    (entry.bind == null ||
      entry.bind === "account" ||
      entry.bind === "character" ||
      entry.bind === "unknown")
  );
}
