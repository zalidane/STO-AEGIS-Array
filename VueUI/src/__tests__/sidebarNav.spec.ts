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
import {
  SIDEBAR_OVERLAY_MAX_WIDTH,
  shouldExpandOnHover,
  shouldUseOverlayDrawer,
  shouldUsePermanentDrawer,
  shouldUseRail,
} from "@/logic/navigation/sidebarInteraction";

describe("APP_NAV_ITEMS", () => {
  it("keeps primary destinations and omits removed sidebar entries", () => {
    const titles = APP_NAV_ITEMS.map((item) => item.title);
    expect(titles).toContain("Home");
    expect(titles).toContain("Pack Simulator");
    expect(titles).toContain("News");
    expect(titles).toContain("Compare");
    expect(titles).toContain("Ship Search");
    expect(APP_NAV_ITEMS.find((item) => item.title === "Ship Search")?.to).toBe(
      "/ships/advanced",
    );
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

describe("sidebarInteraction", () => {
  it("treats iPhone and iPad mini portrait widths as overlay", () => {
    expect(SIDEBAR_OVERLAY_MAX_WIDTH).toBe(840);
    expect(shouldUseOverlayDrawer(390)).toBe(true); // iPhone
    expect(shouldUseOverlayDrawer(744)).toBe(true); // iPad mini portrait
    expect(shouldUseOverlayDrawer(768)).toBe(true);
    expect(shouldUseOverlayDrawer(1024)).toBe(false); // iPad mini landscape
    expect(shouldUseOverlayDrawer(1280)).toBe(false);
  });

  it("disables expand-on-hover without fine hover (touch tablets)", () => {
    expect(shouldExpandOnHover(true, true)).toBe(true);
    expect(shouldExpandOnHover(true, false)).toBe(false);
    expect(shouldExpandOnHover(false, true)).toBe(false);
  });

  it("keeps a permanent rail on tablet landscape unless overlay+unpinned", () => {
    expect(shouldUsePermanentDrawer(false, false)).toBe(true);
    expect(shouldUsePermanentDrawer(false, true)).toBe(true);
    expect(shouldUsePermanentDrawer(true, false)).toBe(false);
    expect(shouldUsePermanentDrawer(true, true)).toBe(true);
  });

  it("uses icon rail only outside overlay when collapsed", () => {
    expect(shouldUseRail(false, false)).toBe(true);
    expect(shouldUseRail(false, true)).toBe(false);
    expect(shouldUseRail(true, false)).toBe(false);
    expect(shouldUseRail(true, true)).toBe(false);
  });
});
