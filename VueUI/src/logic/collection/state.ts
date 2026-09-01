import type {
  CatalogKind,
  CollectionAccount,
  CollectionCharacter,
  CollectionClock,
  CollectionEntry,
  CollectionPlatform,
  CollectionState,
  CollectionStatus,
  CreateAccountInput,
  CreateCharacterInput,
} from "./types";
import {
  createEmptyCollectionState,
  defaultCollectionClock,
  MIGRATED_DEFAULT_ACCOUNT_ID,
} from "./types";
import {
  accountIdForCharacter,
  accountNameTaken,
  charactersOnAccount,
  ensureDefaultAccount,
  getAccount,
  isCollectionPlatform,
  PLATFORM_LABELS,
  sameStoAccount,
  unusedAccountName,
} from "./accounts";
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
import { sanitizeBoffSeatCareers } from "@/logic/loadout/boffPowers";

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

export function createAccount(
  state: CollectionState,
  input: CreateAccountInput,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const name = input.name.trim() || unusedAccountName(state, input.platform);
  if (!name || accountNameTaken(state, { name })) return state;

  const account: CollectionAccount = {
    id: clock.id(),
    name,
    platform: input.platform,
    createdAt: clock.now(),
  };

  return {
    ...state,
    accounts: [...state.accounts, account],
    activeAccountId: account.id,
    activeCharacterId: null,
  };
}

export function updateAccount(
  state: CollectionState,
  accountId: string,
  patch: { name?: string; platform?: CollectionPlatform },
): CollectionState {
  if (!state.accounts.some((account) => account.id === accountId)) {
    return state;
  }
  const nextName = patch.name != null ? patch.name.trim() : undefined;
  if (patch.name != null && !nextName) return state;

  return {
    ...state,
    accounts: state.accounts.map((account) =>
      account.id === accountId
        ? {
            ...account,
            ...(nextName != null ? { name: nextName } : {}),
            ...(patch.platform != null ? { platform: patch.platform } : {}),
          }
        : account,
    ),
  };
}

export function deleteAccount(
  state: CollectionState,
  accountId: string,
): CollectionState {
  const removedCaptains = new Set(
    charactersOnAccount(state, accountId).map((character) => character.id),
  );
  const accounts = state.accounts.filter((account) => account.id !== accountId);
  const characters = state.characters.filter(
    (character) => character.accountId !== accountId,
  );
  const entries = state.entries.filter(
    (entry) => !removedCaptains.has(entry.characterId),
  );
  const loadouts = state.loadouts.filter(
    (loadout) => !removedCaptains.has(loadout.characterId),
  );
  const nextAccountId =
    state.activeAccountId === accountId
      ? (accounts[0]?.id ?? null)
      : state.activeAccountId;
  const activeCharacterId = removedCaptains.has(state.activeCharacterId ?? "")
    ? (characters.find((character) => character.accountId === nextAccountId)
        ?.id ??
      characters[0]?.id ??
      null)
    : state.activeCharacterId;

  return {
    ...state,
    accounts,
    characters,
    entries,
    loadouts,
    activeAccountId: nextAccountId,
    activeCharacterId,
  };
}

export function setActiveAccount(
  state: CollectionState,
  accountId: string | null,
): CollectionState {
  if (accountId != null && !getAccount(state, accountId)) return state;
  const onAccount =
    accountId != null
      ? charactersOnAccount(state, accountId)
      : [];
  const keepCharacter =
    state.activeCharacterId != null &&
    onAccount.some((character) => character.id === state.activeCharacterId);
  return {
    ...state,
    activeAccountId: accountId,
    activeCharacterId: keepCharacter
      ? state.activeCharacterId
      : (onAccount[0]?.id ?? null),
  };
}

export function createCharacter(
  state: CollectionState,
  input: string | CreateCharacterInput,
  clock: CollectionClock = defaultCollectionClock(),
): CollectionState {
  const parsed = parseCreateInput(input);
  if (!parsed.name) return state;

  const withAccount = ensureDefaultAccount(state, clock);
  const accountId =
    (typeof input === "object" ? input.accountId : undefined) ??
    withAccount.activeAccountId ??
    withAccount.accounts[0]?.id;
  if (!accountId || !getAccount(withAccount, accountId)) return state;

  const character: CollectionCharacter = {
    id: clock.id(),
    name: parsed.name,
    createdAt: clock.now(),
    accountId,
    ...(parsed.identity ?? {}),
    traitSlots: [],
  };

  return {
    ...withAccount,
    characters: [...withAccount.characters, character],
    activeCharacterId: character.id,
    activeAccountId: accountId,
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
    accountId?: string;
  },
): CollectionState {
  if (!state.characters.some((character) => character.id === characterId)) {
    return state;
  }
  const nextName = patch.name != null ? patch.name.trim() : undefined;
  if (patch.name != null && !nextName) return state;
  if (patch.accountId != null && !getAccount(state, patch.accountId)) {
    return state;
  }

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
        ...(patch.accountId != null ? { accountId: patch.accountId } : {}),
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
    activeAccountId:
      characterId === state.activeCharacterId && patch.accountId
        ? patch.accountId
        : state.activeAccountId,
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
  const remaining = characters.find(
    (character) => character.id === activeCharacterId,
  );

  return {
    ...withoutLoadouts,
    characters,
    entries,
    activeCharacterId,
    activeAccountId: remaining?.accountId ?? state.activeAccountId,
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
  const accountId =
    characterId != null
      ? accountIdForCharacter(state, characterId)
      : state.activeAccountId;
  return {
    ...state,
    activeCharacterId: characterId,
    activeAccountId: accountId,
  };
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
    .filter(
      (entry) =>
        activeId != null && sameStoAccount(state, entry.characterId, activeId),
    )
    .map((entry) => ({
      characterId: entry.characterId,
      characterName: characterName(state, entry.characterId),
      isActive: false,
    }));

  return { ownedByActive, otherAccountCopies };
}

/** Active captain's own entries plus BtA copies from other captains on the same STO account. */
export function visibleEntriesForActiveCharacter(
  state: CollectionState,
  bindForEntry: (entry: CollectionEntry) => BindScope,
): CollectionEntry[] {
  const activeId = state.activeCharacterId;
  if (!activeId) return [];

  return state.entries.filter((entry) => {
    if (entry.characterId === activeId) return true;
    if (bindForEntry(entry) !== "account") return false;
    return sameStoAccount(state, entry.characterId, activeId);
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
    activeAccountId?: unknown;
    accounts?: unknown;
    characters?: unknown;
    entries?: unknown;
    loadouts?: unknown;
  };
  const version = value.version;
  if (
    (version !== 1 && version !== 2 && version !== 3) ||
    !Array.isArray(value.characters) ||
    !Array.isArray(value.entries)
  ) {
    return createEmptyCollectionState();
  }
  const characters = value.characters.filter(isCharacter);
  const accounts = migrateAccounts(
    Array.isArray(value.accounts) ? value.accounts.filter(isAccount) : [],
    characters,
  );
  const withAccounts = characters.map((character) => ({
    ...character,
    accountId:
      accounts.some((account) => account.id === character.accountId)
        ? character.accountId
        : (accounts[0]?.id ?? MIGRATED_DEFAULT_ACCOUNT_ID),
  }));
  const activeCharacterId =
    typeof value.activeCharacterId === "string" ||
    value.activeCharacterId === null
      ? value.activeCharacterId
      : null;
  const activeFromCharacter = withAccounts.find(
    (character) => character.id === activeCharacterId,
  )?.accountId;
  const activeAccountId =
    typeof value.activeAccountId === "string" &&
    accounts.some((account) => account.id === value.activeAccountId)
      ? value.activeAccountId
      : (activeFromCharacter ?? accounts[0]?.id ?? null);

  return {
    version: 3,
    activeCharacterId,
    activeAccountId,
    accounts,
    characters: withAccounts,
    entries: value.entries.filter(isEntry),
    loadouts:
      (version === 2 || version === 3) && Array.isArray(value.loadouts)
        ? value.loadouts.filter(isLoadout).map(sanitizeLoadoutParse)
        : [],
  };
}

function migrateAccounts(
  parsed: CollectionAccount[],
  characters: CollectionCharacter[],
): CollectionAccount[] {
  if (parsed.length > 0) return parsed;
  if (characters.length === 0) return [];
  return [
    {
      id: MIGRATED_DEFAULT_ACCOUNT_ID,
      name: PLATFORM_LABELS.pc,
      platform: "pc",
      createdAt: characters[0]?.createdAt ?? "2026-01-01T00:00:00.000Z",
    },
  ];
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

function isAccount(value: unknown): value is CollectionAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as CollectionAccount;
  return (
    typeof account.id === "string" &&
    typeof account.name === "string" &&
    typeof account.createdAt === "string" &&
    isCollectionPlatform(account.platform)
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
  if (character.accountId != null && typeof character.accountId !== "string") {
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
  const careers = sanitizeBoffSeatCareers(loadout.boffSeatCareers);
  const withCareers: CollectionLoadout =
    careers === undefined && loadout.boffSeatCareers === undefined
      ? loadout
      : { ...loadout, boffSeatCareers: careers };
  if (withCareers.combatParse == null) return withCareers;
  if (isCombatParseSummary(withCareers.combatParse)) return withCareers;
  const { combatParse: _dropped, ...rest } = withCareers;
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
  if (fill.abilityRank != null && typeof fill.abilityRank !== "number") {
    return false;
  }
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
