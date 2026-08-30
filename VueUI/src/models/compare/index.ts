export const COMPARE_STORAGE_KEY = "sto-aegis:compare-v1";

export interface CompareRepository {
  load(): number[];
  save(ids: number[]): void;
}

export function createSessionCompareRepository(
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof window === "undefined"
    ? null
    : window.sessionStorage,
): CompareRepository {
  return {
    load() {
      if (!storage) return [];
      try {
        const raw = storage.getItem(COMPARE_STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0,
        );
      } catch {
        return [];
      }
    },
    save(ids: number[]) {
      storage?.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
    },
  };
}

export function createMemoryCompareRepository(initial: number[] = []): CompareRepository {
  let current = [...initial];
  return {
    load() {
      return [...current];
    },
    save(ids: number[]) {
      current = [...ids];
    },
  };
}

let repository: CompareRepository | null = null;

export function getCompareRepository(): CompareRepository {
  if (!repository) {
    repository = createSessionCompareRepository();
  }
  return repository;
}

export function setCompareRepository(next: CompareRepository): void {
  repository = next;
}
