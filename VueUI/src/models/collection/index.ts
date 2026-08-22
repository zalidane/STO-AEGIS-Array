import type { CollectionRepository } from "./repository";
import { createLocalStorageCollectionRepository } from "./localStorageRepository";

let repository: CollectionRepository | null = null;

export function getCollectionRepository(): CollectionRepository {
  if (!repository) {
    repository = createLocalStorageCollectionRepository();
  }
  return repository;
}

/** Swap in a memory or HTTP adapter without changing UI callers. */
export function setCollectionRepository(next: CollectionRepository): void {
  repository = next;
}
