import {
  createEmptyCollectionState,
  type CollectionState,
} from "@/logic/collection/types";
import { hydrateCollectionState } from "@/logic/collection/state";
import type { CollectionRepository } from "./repository";

export const COLLECTION_STORAGE_KEY = "sto-aegis:collection-v1";

export function createLocalStorageCollectionRepository(
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): CollectionRepository {
  return {
    load() {
      try {
        const raw = storage.getItem(COLLECTION_STORAGE_KEY);
        if (!raw) return createEmptyCollectionState();
        return hydrateCollectionState(JSON.parse(raw));
      } catch {
        return createEmptyCollectionState();
      }
    },
    save(state: CollectionState) {
      storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(state));
    },
  };
}

export function createMemoryCollectionRepository(
  initial?: CollectionState,
): CollectionRepository {
  let current = initial ?? createEmptyCollectionState();
  return {
    load() {
      return current;
    },
    save(state: CollectionState) {
      current = state;
    },
  };
}
