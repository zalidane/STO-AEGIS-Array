import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  collectItem,
  collectionStatus,
  createCharacter,
  deleteCharacter,
  entryBindForActive,
  getActiveCharacter,
  renameCharacter,
  setActiveCharacter,
  setEntryBind,
  uncollectItem,
} from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CatalogKind,
  type CollectionState,
} from "@/logic/collection/types";
import type { BindScope } from "@/logic/collection/types";
import { getCollectionRepository } from "@/models/collection";

export const useCollectionStore = defineStore("collection", () => {
  const repository = getCollectionRepository();
  const state = ref<CollectionState>(createEmptyCollectionState());

  function persist() {
    repository.save(state.value);
  }

  function load() {
    state.value = repository.load();
  }

  load();

  const characters = computed(() => state.value.characters);
  const activeCharacter = computed(() => getActiveCharacter(state.value));
  const activeCharacterId = computed(() => state.value.activeCharacterId);

  function addCharacter(name: string) {
    state.value = createCharacter(state.value, name);
    persist();
    return getActiveCharacter(state.value);
  }

  function updateCharacterName(characterId: string, name: string) {
    state.value = renameCharacter(state.value, characterId, name);
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

  return {
    state,
    characters,
    activeCharacter,
    activeCharacterId,
    load,
    addCharacter,
    updateCharacterName,
    removeCharacter,
    selectCharacter,
    collect,
    uncollect,
    setBind,
    bindForActive,
    statusFor,
    isOwnedByActive,
  };
});
