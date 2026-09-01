import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  collectItem,
  collectMany as collectManyItems,
  collectionStatus,
  createAccount,
  createCharacter,
  deleteAccount,
  deleteCharacter,
  entryBindForActive,
  getActiveCharacter,
  renameCharacter,
  setActiveAccount,
  setActiveCharacter,
  setEntryBind,
  uncollectItem,
  uncollectMany as uncollectManyItems,
  updateAccount,
  updateCharacter,
} from "@/logic/collection/state";
import {
  applyLoadout,
  attachCombatParse,
  clearCombatParse,
  createLoadout,
  deleteLoadout,
  equipLoadoutSlot,
  loadoutsForCharacter,
  renameLoadout,
  unequipLoadoutSlot,
  updateLoadoutSlotMods,
} from "@/logic/loadout/state";
import {
  equipBoffPowerSlot,
  setBoffSeatCareer as setBoffSeatCareerState,
  type BoffPowerEquipContext,
} from "@/logic/loadout/boffPowerState";
import type { BoffPlayableCareer } from "@/logic/loadout/boffPowers";
import type { CombatParseSummary } from "@/logic/combatlog/types";
import {
  copyShareToCaptain,
  type ShareShipRef,
} from "@/logic/share/copyToCaptain";
import type { ShareCatalogItem, SharePayload } from "@/logic/share/payload";
import type { LoadoutEquipContext } from "@/logic/loadout/types";
import {
  applyCaptainTraitFills,
  equipCaptainTraitSlot,
  unequipCaptainTraitSlot,
  type CaptainTraitEquipContext,
} from "@/logic/loadout/captainTraitState";
import type { CaptainTraitFill } from "@/logic/loadout/captainTraits";
import {
  accountsWithCaptains,
  getActiveAccount,
} from "@/logic/collection/accounts";
import {
  createEmptyCollectionState,
  type CatalogKind,
  type CollectionPlatform,
  type CollectionState,
  type CreateAccountInput,
} from "@/logic/collection/types";
import type { BindScope, CreateCharacterInput } from "@/logic/collection/types";
import { getCollectionRepository } from "@/models/collection";

export const useCollectionStore = defineStore("collection", () => {
  const repository = getCollectionRepository();
  const state = ref<CollectionState>(createEmptyCollectionState());

  function persist() {
    try {
      repository.save(state.value);
    } catch (err) {
      if (isQuotaExceeded(err)) {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
      throw err;
    }
  }

  function load() {
    state.value = repository.load();
  }

  load();

  const characters = computed(() => state.value.characters);
  const accounts = computed(() => state.value.accounts);
  const accountGroups = computed(() => accountsWithCaptains(state.value));
  const activeCharacter = computed(() => getActiveCharacter(state.value));
  const activeCharacterId = computed(() => state.value.activeCharacterId);
  const activeAccount = computed(() => getActiveAccount(state.value));
  const activeAccountId = computed(() => state.value.activeAccountId);

  function addAccount(input: CreateAccountInput) {
    state.value = createAccount(state.value, input);
    persist();
    return getActiveAccount(state.value);
  }

  function editAccount(
    accountId: string,
    patch: { name?: string; platform?: CollectionPlatform },
  ) {
    state.value = updateAccount(state.value, accountId, patch);
    persist();
  }

  function removeAccount(accountId: string) {
    state.value = deleteAccount(state.value, accountId);
    persist();
  }

  function selectAccount(accountId: string | null) {
    state.value = setActiveAccount(state.value, accountId);
    persist();
  }

  function addCharacter(input: string | CreateCharacterInput) {
    state.value = createCharacter(state.value, input);
    persist();
    return getActiveCharacter(state.value);
  }

  function updateCharacterName(characterId: string, name: string) {
    state.value = renameCharacter(state.value, characterId, name);
    persist();
  }

  function updateCharacterIdentity(
    characterId: string,
    patch: {
      name?: string;
      career?: CreateCharacterInput["career"];
      faction?: string;
      race?: string;
      accountId?: string;
    },
  ) {
    state.value = updateCharacter(state.value, characterId, patch);
    persist();
  }

  function removeCharacter(characterId: string) {
    state.value = deleteCharacter(state.value, characterId);
    persist();
  }

  function selectCharacter(characterId: string | null) {
    state.value = setActiveCharacter(state.value, characterId);
    persist();
  }

  function collect(kind: CatalogKind, catalogId: number, bind?: BindScope) {
    state.value = collectItem(state.value, { kind, catalogId, bind });
    persist();
  }

  function uncollect(kind: CatalogKind, catalogId: number) {
    state.value = uncollectItem(state.value, { kind, catalogId });
    persist();
  }

  function collectMany(
    items: Array<{
      kind: CatalogKind;
      catalogId: number;
      bind?: BindScope;
      allowDuplicate?: boolean;
    }>,
  ) {
    state.value = collectManyItems(state.value, items);
    persist();
  }

  function uncollectMany(
    items: Array<{ kind: CatalogKind; catalogId: number }>,
  ) {
    state.value = uncollectManyItems(state.value, items);
    persist();
  }

  function setBind(kind: CatalogKind, catalogId: number, bind: BindScope) {
    state.value = setEntryBind(state.value, { kind, catalogId, bind });
    persist();
  }

  function bindForActive(kind: CatalogKind, catalogId: number) {
    return entryBindForActive(state.value, { kind, catalogId });
  }

  function statusFor(
    kind: CatalogKind,
    catalogId: number,
    bind: BindScope,
  ) {
    return collectionStatus(state.value, { kind, catalogId, bind });
  }

  function isOwnedByActive(kind: CatalogKind, catalogId: number) {
    const activeId = state.value.activeCharacterId;
    if (!activeId) return false;
    return state.value.entries.some(
      (entry) =>
        entry.characterId === activeId &&
        entry.kind === kind &&
        entry.catalogId === catalogId,
    );
  }

  const loadouts = computed(() =>
    loadoutsForCharacter(state.value, state.value.activeCharacterId),
  );

  function addLoadout(shipId: number, name?: string) {
    state.value = createLoadout(state.value, { shipId, name });
    persist();
    return state.value.loadouts[state.value.loadouts.length - 1] ?? null;
  }

  function updateLoadoutName(loadoutId: string, name: string) {
    state.value = renameLoadout(state.value, loadoutId, name);
    persist();
  }

  function removeLoadout(loadoutId: string) {
    state.value = deleteLoadout(state.value, loadoutId);
    persist();
  }

  function equipSlot(
    input: {
      loadoutId: string;
      slotId: string;
      itemId: number;
      catalogKind?: "item" | "starshipTrait";
    },
    context: LoadoutEquipContext,
  ) {
    const result = equipLoadoutSlot(state.value, input, context);
    if (!result.ok) return result;
    state.value = applyLoadout(state.value, result.loadout);
    persist();
    return result;
  }

  function unequipSlot(loadoutId: string, slotId: string) {
    state.value = unequipLoadoutSlot(state.value, { loadoutId, slotId });
    persist();
  }

  function updateSlotMods(
    loadoutId: string,
    slotId: string,
    mods: { quality?: string; mark?: string },
  ) {
    state.value = updateLoadoutSlotMods(state.value, {
      loadoutId,
      slotId,
      ...mods,
    });
    persist();
  }

  function saveCombatParse(loadoutId: string, parse: CombatParseSummary) {
    state.value = attachCombatParse(state.value, loadoutId, parse);
    persist();
  }

  function removeCombatParse(loadoutId: string) {
    state.value = clearCombatParse(state.value, loadoutId);
    persist();
  }

  function equipCaptainTrait(
    input: {
      slotId: string;
      itemId: number;
      catalogKind: CaptainTraitFill["catalogKind"];
    },
    context: CaptainTraitEquipContext,
  ) {
    const result = equipCaptainTraitSlot(state.value, input, context);
    if (!result.ok) return result;
    state.value = applyCaptainTraitFills(state.value, result.fills);
    persist();
    return result;
  }

  function unequipCaptainTrait(slotId: string) {
    state.value = unequipCaptainTraitSlot(state.value, slotId);
    persist();
  }

  function equipBoffPower(
    input: {
      loadoutId: string;
      slotId: string;
      itemId: number;
      abilityRank?: number;
    },
    context: BoffPowerEquipContext,
  ) {
    const result = equipBoffPowerSlot(state.value, input, context);
    if (!result.ok) return result;
    state.value = applyLoadout(state.value, result.loadout);
    persist();
    return result;
  }

  function setBoffSeatCareer(
    input: {
      loadoutId: string;
      stationIndex: number;
      career: BoffPlayableCareer | null;
    },
    context: BoffPowerEquipContext,
  ) {
    state.value = setBoffSeatCareerState(state.value, input, context);
    persist();
  }

  function copySharedLoadout(input: {
    payload: SharePayload;
    items: ReadonlyArray<ShareCatalogItem>;
    ships: ReadonlyArray<ShareShipRef>;
  }) {
    const result = copyShareToCaptain(state.value, input);
    if (result.ok) {
      state.value = result.state;
      persist();
    }
    return result;
  }

  return {
    state,
    characters,
    accounts,
    accountGroups,
    activeCharacter,
    activeCharacterId,
    activeAccount,
    activeAccountId,
    loadouts,
    load,
    addAccount,
    editAccount,
    removeAccount,
    selectAccount,
    addCharacter,
    updateCharacterName,
    updateCharacterIdentity,
    removeCharacter,
    selectCharacter,
    collect,
    uncollect,
    collectMany,
    uncollectMany,
    setBind,
    bindForActive,
    statusFor,
    isOwnedByActive,
    addLoadout,
    updateLoadoutName,
    removeLoadout,
    equipSlot,
    unequipSlot,
    updateSlotMods,
    saveCombatParse,
    removeCombatParse,
    equipCaptainTrait,
    unequipCaptainTrait,
    equipBoffPower,
    setBoffSeatCareer,
    copySharedLoadout,
  };
});

function isQuotaExceeded(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return true;
  }
  return "code" in err && err.code === 22;
}
