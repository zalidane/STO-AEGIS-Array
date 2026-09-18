import {
  sanitizeSidebarPrefs,
  type SidebarPrefs,
} from "@/logic/navigation/sidebarPrefs";

export const SIDEBAR_PREFS_STORAGE_KEY = "sto-aegis:sidebar-v1";

export interface SidebarPrefsRepository {
  load(): SidebarPrefs;
  save(prefs: SidebarPrefs): void;
}

export function createLocalStorageSidebarPrefsRepository(
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof window ===
  "undefined"
    ? null
    : window.localStorage,
): SidebarPrefsRepository {
  return {
    load() {
      if (!storage) return sanitizeSidebarPrefs(null);
      try {
        const raw = storage.getItem(SIDEBAR_PREFS_STORAGE_KEY);
        if (!raw) return sanitizeSidebarPrefs(null);
        return sanitizeSidebarPrefs(JSON.parse(raw) as unknown);
      } catch {
        return sanitizeSidebarPrefs(null);
      }
    },
    save(prefs: SidebarPrefs) {
      storage?.setItem(SIDEBAR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    },
  };
}

export function createMemorySidebarPrefsRepository(
  initial: SidebarPrefs = sanitizeSidebarPrefs(null),
): SidebarPrefsRepository {
  let current: SidebarPrefs = { ...initial };
  return {
    load() {
      return { ...current };
    },
    save(prefs: SidebarPrefs) {
      current = { ...prefs };
    },
  };
}

let repository: SidebarPrefsRepository | null = null;

export function getSidebarPrefsRepository(): SidebarPrefsRepository {
  if (!repository) {
    repository = createLocalStorageSidebarPrefsRepository();
  }
  return repository;
}

export function setSidebarPrefsRepository(next: SidebarPrefsRepository): void {
  repository = next;
}
