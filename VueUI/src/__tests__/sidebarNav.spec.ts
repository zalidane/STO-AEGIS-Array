import { describe, it, expect, beforeEach } from "vitest";
import {
  APP_NAV_ITEMS,
  REMOVED_SIDEBAR_NAV_TITLES,
} from "@/logic/navigation/navItems";
import {
  DEFAULT_SIDEBAR_EXPANDED,
  sanitizeSidebarExpanded,
  sanitizeSidebarPrefs,
} from "@/logic/navigation/sidebarPrefs";
import {
  SIDEBAR_PREFS_STORAGE_KEY,
  createLocalStorageSidebarPrefsRepository,
  createMemorySidebarPrefsRepository,
} from "@/models/navigation/sidebarPrefsRepository";

describe("APP_NAV_ITEMS", () => {
  it("keeps primary destinations and omits removed sidebar entries", () => {
    const titles = APP_NAV_ITEMS.map((item) => item.title);
    expect(titles).toContain("Home");
    expect(titles).toContain("Pack Simulator");
    expect(titles).toContain("Compare");
    for (const removed of REMOVED_SIDEBAR_NAV_TITLES) {
      expect(titles).not.toContain(removed);
    }
  });
});

describe("sidebarPrefs", () => {
  it("defaults to collapsed (icon rail)", () => {
    expect(DEFAULT_SIDEBAR_EXPANDED).toBe(false);
    expect(sanitizeSidebarExpanded(undefined)).toBe(false);
    expect(sanitizeSidebarPrefs(null)).toEqual({ expanded: false });
  });

  it("accepts a boolean expanded flag and ignores junk", () => {
    expect(sanitizeSidebarExpanded(true)).toBe(true);
    expect(sanitizeSidebarPrefs({ expanded: true })).toEqual({
      expanded: true,
    });
    expect(sanitizeSidebarPrefs({ expanded: "yes" })).toEqual({
      expanded: false,
    });
    expect(sanitizeSidebarPrefs([])).toEqual({ expanded: false });
  });
});

describe("sidebarPrefsRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists expanded state in localStorage", () => {
    const repo = createLocalStorageSidebarPrefsRepository(window.localStorage);
    expect(repo.load()).toEqual({ expanded: false });
    repo.save({ expanded: true });
    expect(JSON.parse(window.localStorage.getItem(SIDEBAR_PREFS_STORAGE_KEY)!)).toEqual({
      expanded: true,
    });
    expect(repo.load()).toEqual({ expanded: true });
  });

  it("recovers from corrupt storage", () => {
    window.localStorage.setItem(SIDEBAR_PREFS_STORAGE_KEY, "{not-json");
    const repo = createLocalStorageSidebarPrefsRepository(window.localStorage);
    expect(repo.load()).toEqual({ expanded: false });
  });

  it("supports an in-memory repository for tests", () => {
    const repo = createMemorySidebarPrefsRepository({ expanded: true });
    expect(repo.load()).toEqual({ expanded: true });
    repo.save({ expanded: false });
    expect(repo.load()).toEqual({ expanded: false });
  });
});
