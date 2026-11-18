import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import {
  DEFAULT_PUBLIC_BUILDS_VIEW_STATE,
  PUBLIC_BUILDS_PAGE_SIZE,
  clampPublicBuildsPage,
  formatPublicBuildDate,
  parseBuildsTab,
  parsePublicBuildsViewState,
  publicBuildsFiltersAreActive,
  publicBuildsOffset,
  publicBuildsPageCount,
  serializePublicBuildsViewState,
} from "@/logic/publicBuilds/queryState";
import { listMyBuilds } from "@/logic/publicBuilds/myBuilds";
import { APP_NAV_ITEMS, REMOVED_SIDEBAR_NAV_TITLES } from "@/logic/navigation/navItems";
import { setCollectionRepository } from "@/models/collection";
import {
  createLocalStorageCollectionRepository,
  createMemoryCollectionRepository,
} from "@/models/collection/localStorageRepository";
import type { CollectionState } from "@/logic/collection/types";
import type { CollectionLoadout } from "@/logic/loadout/types";
import Builds from "@/views/Builds.vue";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const yeagerShip = {
  id: 3196,
  name: "Yeager Miracle Worker Escort",
  image: "File:Fed Ship Yeager.png",
  type: "Escort",
  tier: 6,
  faction: "Federation",
  factionLede: "Federation",
  displayPrefix: null,
  displayClass: "Yeager",
  displayType: "Miracle Worker Escort",
};

const defiantShip = {
  id: 10,
  name: "Defiant Tactical Escort",
  image: null,
  type: "Escort",
  tier: 5,
  faction: "Federation",
  factionLede: "Federation",
  displayPrefix: null,
  displayClass: "Defiant",
  displayType: "Tactical Escort",
};

const connection = vi.hoisted(() => ({
  totalCount: 2,
  offset: 0,
  limit: 24,
  facets: {
    factions: ["Federation"],
    tiers: [5, 6],
    shipNames: ["Tactical Escort", "Yeager Miracle Worker Escort"],
  },
  items: [
    {
      publicCode: "pub1",
      title: "Yeager Energy",
      shipName: "Yeager Miracle Worker Escort",
      fillCount: 14,
      featuredCount: 2,
      listedAt: "2026-11-17T12:00:00.000Z",
      createdAt: "2026-11-10T00:00:00.000Z",
      updatedAt: "2026-11-17T12:00:00.000Z",
      ship: {
        id: 3196,
        name: "Yeager Miracle Worker Escort",
        image: "File:Fed Ship Yeager.png",
        type: "Escort",
        tier: 6,
      },
    },
    {
      publicCode: "pub0",
      title: "Alpha Strike",
      shipName: "Tactical Escort",
      fillCount: 10,
      featuredCount: 0,
      listedAt: "2026-01-02T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      ship: {
        id: 10,
        name: "Defiant Tactical Escort",
        image: null,
        type: "Escort",
        tier: 5,
      },
    },
  ],
}));

function operationName(document: { definitions?: Array<{ name?: { value?: string } }> }): string {
  return document.definitions?.[0]?.name?.value ?? "";
}

vi.mock("@vue/apollo-composable", async () => {
  const { ref } = await import("vue");
  return {
    useQuery: (document: { definitions?: Array<{ name?: { value?: string } }> }) => {
      const name = operationName(document);
      if (name === "PublicBuilds") {
        return {
          result: ref({ publicBuilds: connection }),
          loading: ref(false),
          error: ref(null),
        };
      }
      return {
        result: ref({ ships: [yeagerShip, defiantShip] }),
        loading: ref(false),
        error: ref(null),
      };
    },
  };
});

const yeagerLoadout: CollectionLoadout = {
  id: "lo-1",
  characterId: "alice",
  shipId: 3196,
  name: "My Yeager",
  createdAt: "2026-11-10T00:00:00.000Z",
  updatedAt: "2026-11-17T12:00:00.000Z",
  slots: [{ slotId: "foreWeapon-0", itemId: 1 }],
  combatParse: {
    uploadedAt: "2026-11-17T12:00:00.000Z",
    fileName: "combatlog.log",
    captainId: "alice",
    captainLabel: "Sla'yor",
    fights: [
      {
        index: 0,
        durationMs: 60000,
        damageOut: 72000,
        dps: 1200,
        damageTaken: 0,
        allyHeals: 0,
        solo: true,
        otherPlayerCount: 0,
        mixLabel: "solo",
        rankNotes: [],
        participation: "full",
      },
    ],
  },
};

const olderLoadout: CollectionLoadout = {
  id: "lo-2",
  characterId: "alice",
  shipId: 10,
  name: "Classic Escort",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  slots: [],
};

function collectionState(loadouts: CollectionLoadout[] = [yeagerLoadout, olderLoadout]): CollectionState {
  return {
    version: 4,
    activeCharacterId: "alice",
    activeAccountId: "pc",
    accounts: [
      {
        id: "pc",
        name: "Original",
        platform: "pc",
        createdAt: "2026-08-22T00:00:00.000Z",
      },
    ],
    characters: [
      {
        id: "alice",
        name: "Sla'yor",
        createdAt: "2026-08-22T00:00:00.000Z",
        accountId: "pc",
        traitSlots: [],
      },
    ],
    entries: [],
    loadouts: [
      ...loadouts,
      {
        ...olderLoadout,
        id: "lo-other",
        characterId: "other",
        name: "Someone Else",
      },
    ],
  };
}

function buildsRouter(initial = "/builds") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      {
        path: "/loadouts",
        redirect: (to) => ({
          path: "/builds",
          query: { ...to.query, tab: "mine" },
        }),
      },
      { path: "/builds", component: Builds, name: "builds" },
      { path: "/b/:code", component: { template: "<div />" }, name: "shared-build" },
      {
        path: "/ships/:id/loadout",
        component: { template: "<div />" },
        name: "ship-loadout",
      },
    ],
  });
  return router.push(initial).then(() => router.isReady()).then(() => router);
}

async function mountBuilds(path: string, state: CollectionState = collectionState()) {
  setCollectionRepository(createMemoryCollectionRepository(state));
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = await buildsRouter(path);
  const wrapper = mount(Builds, {
    global: {
      plugins: [router, pinia, createVuetify()],
      stubs: {
        AppBreadcrumbs: true,
        VImg: true,
      },
    },
  });
  await nextTick();
  return { wrapper, router };
}

afterEach(() => {
  setCollectionRepository(createLocalStorageCollectionRepository());
});

describe("builds query state", () => {
  it("parses and serializes the route query, including the tab", () => {
    const state = parsePublicBuildsViewState({
      q: " yeager ",
      ship: "Yeager Miracle Worker Escort",
      faction: "Federation",
      tier: "6",
      sort: "FEATURED",
      page: "2",
      tab: "published",
    });
    expect(state.search).toBe("yeager");
    expect(state.tier).toBe(6);
    expect(state.sort).toBe("FEATURED");
    expect(state.page).toBe(2);
    expect(state.tab).toBe("published");
    expect(serializePublicBuildsViewState(state)).toEqual({
      q: "yeager",
      ship: "Yeager Miracle Worker Escort",
      faction: "Federation",
      tier: "6",
      sort: "FEATURED",
      page: "2",
      tab: "published",
    });
    expect(serializePublicBuildsViewState(DEFAULT_PUBLIC_BUILDS_VIEW_STATE)).toEqual(
      {},
    );
    expect(parseBuildsTab("public")).toBe("published");
    expect(parseBuildsTab("loadouts")).toBe("mine");
    expect(parsePublicBuildsViewState({}).tab).toBe("mine");
  });

  it("computes pagination offsets and clamps the page", () => {
    expect(publicBuildsOffset(1)).toBe(0);
    expect(publicBuildsOffset(2)).toBe(PUBLIC_BUILDS_PAGE_SIZE);
    expect(publicBuildsPageCount(0)).toBe(1);
    expect(publicBuildsPageCount(25)).toBe(2);
    expect(clampPublicBuildsPage(9, 25)).toBe(2);
    expect(clampPublicBuildsPage(0, 25)).toBe(1);
    expect(
      publicBuildsFiltersAreActive({
        ...DEFAULT_PUBLIC_BUILDS_VIEW_STATE,
        search: "yeager",
      }),
    ).toBe(true);
  });

  it("formats a published date", () => {
    expect(formatPublicBuildDate("2026-11-17T12:00:00.000Z")).toBe(
      "November 17, 2026",
    );
    expect(formatPublicBuildDate(null)).toBe("");
  });
});

describe("listMyBuilds", () => {
  it("filters, sorts, and paginates local loadouts without sending them to a server", () => {
    const result = listMyBuilds({
      loadouts: [yeagerLoadout, olderLoadout],
      ships: [yeagerShip, defiantShip],
      captain: { faction: "Federation" },
      search: "yeager",
      sort: "NEWEST",
      offset: 0,
      limit: 24,
    });
    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.title).toBe("My Yeager");
    expect(result.items[0]?.to).toBe("/ships/3196/loadout?loadout=lo-1");
    expect(result.items[0]?.peakDpsLabel).toContain("DPS");
    expect(result.facets.shipNames).toEqual([
      "Defiant Tactical Escort",
      "Yeager Miracle Worker Escort",
    ]);

    const byName = listMyBuilds({
      loadouts: [yeagerLoadout, olderLoadout],
      ships: [yeagerShip, defiantShip],
      captain: null,
      sort: "NAME",
    });
    expect(byName.items.map((item) => item.title)).toEqual([
      "Classic Escort",
      "My Yeager",
    ]);

    const paged = listMyBuilds({
      loadouts: [yeagerLoadout, olderLoadout],
      ships: [yeagerShip, defiantShip],
      captain: null,
      sort: "NEWEST",
      offset: 1,
      limit: 1,
    });
    expect(paged.totalCount).toBe(2);
    expect(paged.items).toHaveLength(1);
    expect(paged.items[0]?.title).toBe("Classic Escort");

    const byTier = listMyBuilds({
      loadouts: [yeagerLoadout, olderLoadout],
      ships: [yeagerShip, defiantShip],
      captain: null,
      tier: 5,
    });
    expect(byTier.items.map((item) => item.title)).toEqual(["Classic Escort"]);
  });
});

describe("navigation", () => {
  it("replaces Loadouts with a single Builds entry", () => {
    expect(APP_NAV_ITEMS.find((item) => item.title === "Builds")?.to).toBe(
      "/builds",
    );
    const titles = APP_NAV_ITEMS.map((item) => item.title);
    expect(titles).not.toContain("Loadouts");
    expect(titles).not.toContain("Published Builds");
    expect(REMOVED_SIDEBAR_NAV_TITLES).toContain("Loadouts");
    expect(REMOVED_SIDEBAR_NAV_TITLES).toContain("Published Builds");
  });
});

describe("Builds page", () => {
  it("redirects /loadouts to the My Builds tab", async () => {
    const router = await buildsRouter("/loadouts");
    expect(router.currentRoute.value.path).toBe("/builds");
    expect(router.currentRoute.value.query.tab).toBe("mine");
  });

  it("renders published cards that open the existing shared build route", async () => {
    const { wrapper } = await mountBuilds("/builds?tab=published");
    expect(wrapper.text()).toContain("Yeager Energy");
    expect(wrapper.text()).toContain("Alpha Strike");
    expect(wrapper.text()).toContain("2 published");
    const links = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(links).toContain("/b/pub1");
    expect(links).toContain("/b/pub0");
  });

  it("lists the active captain's local loadouts and opens the builder", async () => {
    const { wrapper } = await mountBuilds("/builds?tab=mine");
    expect(wrapper.text()).toContain("My Yeager");
    expect(wrapper.text()).toContain("Classic Escort");
    expect(wrapper.text()).toContain("Sla'yor");
    expect(wrapper.text()).not.toContain("Someone Else");
    expect(wrapper.text()).not.toContain("Yeager Energy");
    const links = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(links).toContain("/ships/3196/loadout?loadout=lo-1");
    expect(links).toContain("/ships/10/loadout?loadout=lo-2");
  });

  it("defaults /builds to the My Builds tab", async () => {
    const { wrapper } = await mountBuilds("/builds");
    expect(wrapper.text()).toContain("My Yeager");
    expect(wrapper.text()).not.toContain("Yeager Energy");
  });
});
