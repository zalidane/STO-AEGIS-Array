import {
  hydrateShareRecords,
  type LocalShareRecord,
} from "@/logic/share/records";

export interface ShareRepository {
  load(): LocalShareRecord[];
  save(records: LocalShareRecord[]): void;
}

export const SHARE_STORAGE_KEY = "sto-aegis:shares-v1";

export function createLocalStorageShareRepository(
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): ShareRepository {
  return {
    load() {
      try {
        const raw = storage.getItem(SHARE_STORAGE_KEY);
        if (!raw) return [];
        return hydrateShareRecords(JSON.parse(raw));
      } catch {
        return [];
      }
    },
    save(records: LocalShareRecord[]) {
      storage.setItem(SHARE_STORAGE_KEY, JSON.stringify(records));
    },
  };
}

export function createMemoryShareRepository(
  initial: LocalShareRecord[] = [],
): ShareRepository {
  let current = initial;
  return {
    load() {
      return current;
    },
    save(records: LocalShareRecord[]) {
      current = records;
    },
  };
}

let repository: ShareRepository | null = null;

export function getShareRepository(): ShareRepository {
  if (!repository) {
    repository = createLocalStorageShareRepository();
  }
  return repository;
}

export function setShareRepository(next: ShareRepository): void {
  repository = next;
}
