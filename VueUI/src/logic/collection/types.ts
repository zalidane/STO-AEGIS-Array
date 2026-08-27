import type { CollectionLoadout } from "@/logic/loadout/types";

export const COLLECTION_STATE_VERSION = 2 as const;

export type CatalogKind = "ship" | "trait" | "starshipTrait" | "item";

export type BindScope = "account" | "character" | "unknown";

export type CollectionCharacter = {
  id: string;
  name: string;
  createdAt: string;
};

export type CollectionEntry = {
  id: string;
  characterId: string;
  kind: CatalogKind;
  catalogId: number;
  collectedAt: string;
  /** How this captain's copy is bound. Falls back to catalog bind when omitted. */
  bind?: BindScope;
};

export type CollectionState = {
  version: typeof COLLECTION_STATE_VERSION;
  activeCharacterId: string | null;
  characters: CollectionCharacter[];
  entries: CollectionEntry[];
  loadouts: CollectionLoadout[];
};

export type CollectionCopy = {
  characterId: string;
  characterName: string;
  isActive: boolean;
};

export type CollectionStatus = {
  ownedByActive: boolean;
  /** BtA copies on other captains. Hidden for character-bound items. */
  otherAccountCopies: CollectionCopy[];
};

export type CollectionClock = {
  now: () => string;
  id: () => string;
};

export function createEmptyCollectionState(): CollectionState {
  return {
    version: COLLECTION_STATE_VERSION,
    activeCharacterId: null,
    characters: [],
    entries: [],
    loadouts: [],
  };
}

export function defaultCollectionClock(): CollectionClock {
  return {
    now: () => new Date().toISOString(),
    id: () => crypto.randomUUID(),
  };
}
