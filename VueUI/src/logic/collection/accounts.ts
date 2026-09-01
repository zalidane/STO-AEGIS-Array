import {
  COLLECTION_PLATFORMS,
  MIGRATED_DEFAULT_ACCOUNT_ID,
  type CollectionAccount,
  type CollectionCharacter,
  type CollectionClock,
  type CollectionPlatform,
  type CollectionState,
} from "./types";

export const PLATFORM_LABELS: Record<CollectionPlatform, string> = {
  pc: "PC",
  steam: "Steam",
  epic: "Epic",
  arc: "Arc",
  playstation: "PlayStation",
  xbox: "Xbox",
  other: "Other",
};

export const PLATFORM_ICONS: Record<CollectionPlatform, string> = {
  pc: "mdi-monitor",
  steam: "mdi-steam",
  epic: "mdi-lightning-bolt",
  arc: "mdi-application",
  playstation: "mdi-sony-playstation",
  xbox: "mdi-microsoft-xbox",
  other: "mdi-gamepad-variant",
};

export function isCollectionPlatform(
  value: unknown,
): value is CollectionPlatform {
  return (
    typeof value === "string" &&
    (COLLECTION_PLATFORMS as readonly string[]).includes(value)
  );
}

export function platformLabel(platform: CollectionPlatform): string {
  return PLATFORM_LABELS[platform];
}

export function platformIcon(platform: CollectionPlatform): string {
  return PLATFORM_ICONS[platform];
}

export function getAccount(
  state: CollectionState,
  accountId: string | null | undefined,
): CollectionAccount | null {
  if (!accountId) return null;
  return state.accounts.find((account) => account.id === accountId) ?? null;
}

export function getActiveAccount(
  state: CollectionState,
): CollectionAccount | null {
  const fromId = getAccount(state, state.activeAccountId);
  if (fromId) return fromId;
  const character = state.characters.find(
    (row) => row.id === state.activeCharacterId,
  );
  return getAccount(state, character?.accountId);
}

export function charactersOnAccount(
  state: CollectionState,
  accountId: string,
): CollectionCharacter[] {
  return state.characters.filter(
    (character) => character.accountId === accountId,
  );
}

export function accountIdForCharacter(
  state: CollectionState,
  characterId: string,
): string | null {
  return (
    state.characters.find((character) => character.id === characterId)
      ?.accountId ?? null
  );
}

export function sameStoAccount(
  state: CollectionState,
  characterIdA: string,
  characterIdB: string,
): boolean {
  const a = accountIdForCharacter(state, characterIdA);
  const b = accountIdForCharacter(state, characterIdB);
  return Boolean(a && a === b);
}

export function captainNameTaken(
  state: CollectionState,
  input: { name: string; accountId: string; exceptCharacterId?: string },
): boolean {
  const name = input.name.trim().toLowerCase();
  if (!name) return false;
  return charactersOnAccount(state, input.accountId).some(
    (character) =>
      character.name.toLowerCase() === name &&
      character.id !== input.exceptCharacterId,
  );
}

export function accountNameTaken(
  state: CollectionState,
  input: { name: string; exceptAccountId?: string },
): boolean {
  const name = input.name.trim().toLowerCase();
  if (!name) return false;
  return state.accounts.some(
    (account) =>
      account.name.toLowerCase() === name &&
      account.id !== input.exceptAccountId,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True for "PC", "Steam", "PC 2", and other numbered platform defaults. */
export function isStockAccountName(
  name: string,
  platform?: CollectionPlatform,
): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const platforms = platform ? [platform] : [...COLLECTION_PLATFORMS];
  return platforms.some((row) => {
    const label = escapeRegExp(PLATFORM_LABELS[row]);
    return new RegExp(`^${label}(?: \\d+)?$`, "i").test(trimmed);
  });
}

/** Next free folder name for a platform ("PC", then "PC 2", "PC 3", …). */
export function unusedAccountName(
  state: CollectionState,
  platform: CollectionPlatform,
  exceptAccountId?: string,
): string {
  const base = PLATFORM_LABELS[platform];
  if (!accountNameTaken(state, { name: base, exceptAccountId })) return base;
  let n = 2;
  while (
    accountNameTaken(state, { name: `${base} ${n}`, exceptAccountId })
  ) {
    n += 1;
  }
  return `${base} ${n}`;
}

/**
 * First captain on an empty save gets a PC folder. Existing accounts are left
 * alone so an Xbox-only setup does not sprout a blank PC folder.
 */
export function ensureDefaultAccount(
  state: CollectionState,
  clock: CollectionClock,
): CollectionState {
  if (state.accounts.length > 0) return state;
  const account: CollectionAccount = {
    id: MIGRATED_DEFAULT_ACCOUNT_ID,
    name: PLATFORM_LABELS.pc,
    platform: "pc",
    createdAt: clock.now(),
  };
  return {
    ...state,
    accounts: [account],
    activeAccountId: account.id,
  };
}

export function accountsWithCaptains(
  state: CollectionState,
): Array<{ account: CollectionAccount; characters: CollectionCharacter[] }> {
  return state.accounts.map((account) => ({
    account,
    characters: charactersOnAccount(state, account.id),
  }));
}
