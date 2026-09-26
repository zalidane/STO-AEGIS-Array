/** localStorage key for Advanced Ship Search filter panel prefs. */
export const ADVANCED_SHIP_SEARCH_FILTER_PREFS_KEY =
  "sto-aegis:advanced-ship-search-filters-v1";

export type AdvancedShipSearchFilterPrefs = {
  /** Whether the filter panel body (search + groups) is expanded. */
  expanded: boolean;
};

export const DEFAULT_ADVANCED_SHIP_SEARCH_FILTER_PREFS: AdvancedShipSearchFilterPrefs =
  {
    expanded: true,
  };

export function sanitizeAdvancedShipSearchFilterPrefs(
  raw: unknown,
): AdvancedShipSearchFilterPrefs {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ADVANCED_SHIP_SEARCH_FILTER_PREFS };
  }
  const record = raw as Record<string, unknown>;
  return {
    expanded:
      typeof record.expanded === "boolean"
        ? record.expanded
        : DEFAULT_ADVANCED_SHIP_SEARCH_FILTER_PREFS.expanded,
  };
}

export function loadAdvancedShipSearchFilterPrefs(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): AdvancedShipSearchFilterPrefs {
  if (!storage) return { ...DEFAULT_ADVANCED_SHIP_SEARCH_FILTER_PREFS };
  try {
    const raw = storage.getItem(ADVANCED_SHIP_SEARCH_FILTER_PREFS_KEY);
    if (!raw) return { ...DEFAULT_ADVANCED_SHIP_SEARCH_FILTER_PREFS };
    return sanitizeAdvancedShipSearchFilterPrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_ADVANCED_SHIP_SEARCH_FILTER_PREFS };
  }
}

export function saveAdvancedShipSearchFilterPrefs(
  prefs: AdvancedShipSearchFilterPrefs,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): void {
  storage?.setItem(
    ADVANCED_SHIP_SEARCH_FILTER_PREFS_KEY,
    JSON.stringify(sanitizeAdvancedShipSearchFilterPrefs(prefs)),
  );
}
