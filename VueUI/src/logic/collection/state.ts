import type {
  CatalogKind,
  CollectionCharacter,
  CollectionClock,
  CollectionEntry,
  CollectionState,
  CollectionStatus,
} from "./types";
import { createEmptyCollectionState, defaultCollectionClock } from "./types";
import type { BindScope } from "./types";

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

export function createCharacter(
  state: CollectionState,
  name: string,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const trimmed = name.trim();
  if (!trimmed) return state;

  const character: CollectionCharacter = {
    id: clock.id(),
    name: trimmed,
    createdAt: clock.now(),
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
  const trimmed = name.trim();
  if (!trimmed) return state;
  if (!state.characters.some((character) => character.id === characterId)) {
    return state;
  }

  return {
    ...state,
    characters: state.characters.map((character) =>
      character.id === characterId ? { ...character, name: trimmed } : character,
    ),
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
  const activeCharacterId =
    state.activeCharacterId === characterId
      ? (characters[0]?.id ?? null)
      : state.activeCharacterId;

  return {
    ...state,
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

export function collectItem(
  state: CollectionState,
  input: {
    kind: CatalogKind;
    catalogId: number;
    bind?: BindScope;
  },
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const characterId = state.activeCharacterId;
  if (!characterId) return state;

  const already = state.entries.some(
    (entry) =>
      entry.characterId === characterId &&
      entry.kind === input.kind &&
      entry.catalogId === input.catalogId,
  );
  if (already) return state;

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

  return {
    ...state,
    entries: state.entries.filter(
      (entry) =>
        !(
          entry.characterId === characterId &&
          entry.kind === input.kind &&
          entry.catalogId === input.catalogId
        ),
    ),
  };
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

export function hydrateCollectionState(
  raw: unknown,
): CollectionState {
  if (!raw || typeof raw !== "object") {
    return createEmptyCollectionState();
  }
  const value = raw as Partial<CollectionState>;
  if (value.version !== 1 || !Array.isArray(value.characters) || !Array.isArray(value.entries)) {
    return createEmptyCollectionState();
  }
  return {
    version: 1,
    activeCharacterId:
      typeof value.activeCharacterId === "string" ||
      value.activeCharacterId === null
        ? value.activeCharacterId
        : null,
    characters: value.characters.filter(isCharacter),
    entries: value.entries.filter(isEntry),
  };
}

function isCharacter(value: unknown): value is CollectionCharacter {
  if (!value || typeof value !== "object") return false;
  const character = value as CollectionCharacter;
  return (
    typeof character.id === "string" &&
    typeof character.name === "string" &&
    typeof character.createdAt === "string"
  );
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
