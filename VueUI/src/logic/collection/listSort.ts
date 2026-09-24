export type CollectionListSortDirection = "asc" | "desc";

export const COLLECTION_LIST_SORT_KEY = "sto-aegis:collection-list-sort";

export type CollectionListSortPrefs = {
  direction: CollectionListSortDirection;
};

export function createDefaultCollectionListSortPrefs(): CollectionListSortPrefs {
  return { direction: "asc" };
}

export function isCollectionListSortDirection(
  value: unknown,
): value is CollectionListSortDirection {
  return value === "asc" || value === "desc";
}

export function sortRowsByName<T>(
  rows: ReadonlyArray<T>,
  nameOf: (row: T) => string,
  direction: CollectionListSortDirection = "asc",
): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const cmp = nameOf(left).localeCompare(nameOf(right), undefined, {
      sensitivity: "base",
      numeric: true,
    });
    return cmp * factor;
  });
}

export function toggleCollectionListSortDirection(
  direction: CollectionListSortDirection,
): CollectionListSortDirection {
  return direction === "asc" ? "desc" : "asc";
}

export function readStoredCollectionListSort(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): CollectionListSortPrefs {
  const defaults = createDefaultCollectionListSortPrefs();
  try {
    const raw = storage.getItem(COLLECTION_LIST_SORT_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<CollectionListSortPrefs>;
    if (!isCollectionListSortDirection(parsed.direction)) return defaults;
    return { direction: parsed.direction };
  } catch {
    return defaults;
  }
}

export function writeStoredCollectionListSort(
  prefs: CollectionListSortPrefs,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  storage.setItem(COLLECTION_LIST_SORT_KEY, JSON.stringify(prefs));
}
