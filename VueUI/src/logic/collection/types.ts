import type { CaptainCareer } from "@/logic/captain/identity";
import type { CaptainTraitFill } from "@/logic/loadout/captainTraits";
import type { CollectionLoadout } from "@/logic/loadout/types";

export const COLLECTION_STATE_VERSION = 3 as const;

export type CatalogKind = "ship" | "trait" | "starshipTrait" | "item";

export type BindScope = "account" | "character" | "unknown";

export const COLLECTION_PLATFORMS = [
  "pc",
  "steam",
  "epic",
  "arc",
  "playstation",
  "xbox",
  "other",
] as const;

export type CollectionPlatform = (typeof COLLECTION_PLATFORMS)[number];

/** Stable id used when migrating saves that had no STO account folders. */
export const MIGRATED_DEFAULT_ACCOUNT_ID = "account-default";

export type CollectionAccount = {
  id: string;
  name: string;
  platform: CollectionPlatform;
  createdAt: string;
};

export type CollectionCharacter = {
  id: string;
  name: string;
  createdAt: string;
  /** STO account this captain belongs to (PC / Steam / Epic / Arc / console). */
  accountId: string;
  career?: CaptainCareer;
  faction?: string;
  race?: string;
  traitSlots?: CaptainTraitFill[];
};

export type CreateAccountInput = {
  name: string;
  platform: CollectionPlatform;
};

export type CreateCharacterInput = {
  name: string;
  career: CaptainCareer;
  faction: string;
  race: string;
  accountId?: string;
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
  activeAccountId: string | null;
  accounts: CollectionAccount[];
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
  /** BtA copies on other captains of the same STO account. Hidden for character-bound items. */
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
    activeAccountId: null,
    accounts: [],
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
