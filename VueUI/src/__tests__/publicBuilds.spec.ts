import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import {
  DEFAULT_PUBLIC_BUILDS_VIEW_STATE,
  PUBLIC_BUILDS_PAGE_SIZE,
  clampPublicBuildsPage,
  formatPublicBuildDate,
  parsePublicBuildsViewState,
  publicBuildsFiltersAreActive,
  publicBuildsOffset,
  publicBuildsPageCount,
  serializePublicBuildsViewState,
} from "@/logic/publicBuilds/queryState";
import { APP_NAV_ITEMS } from "@/logic/navigation/navItems";
import PublicBuilds from "@/views/PublicBuilds.vue";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

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

vi.mock("@vue/apollo-composable", async () => {
  const { ref } = await import("vue");
  return {
    useQuery: () => ({
      result: ref({ publicBuilds: connection }),
      loading: ref(false),
      error: ref(null),
    }),
  };
});

describe("public builds query state", () => {
  it("parses and serializes the route query", () => {
    const state = parsePublicBuildsViewState({
      q: " yeager ",
      ship: "Yeager Miracle Worker Escort",
      faction: "Federation",
      tier: "6",
      sort: "FEATURED",
      page: "2",
    });
    expect(state.search).toBe("yeager");
    expect(state.tier).toBe(6);
    expect(state.sort).toBe("FEATURED");
    expect(state.page).toBe(2);
    expect(serializePublicBuildsViewState(state)).toEqual({
      q: "yeager",
      ship: "Yeager Miracle Worker Escort",
      faction: "Federation",
      tier: "6",
      sort: "FEATURED",
      page: "2",
    });
    expect(serializePublicBuildsViewState(DEFAULT_PUBLIC_BUILDS_VIEW_STATE)).toEqual(
      {},
    );
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

describe("navigation", () => {
  it("links Published Builds in the sidebar", () => {
    expect(
      APP_NAV_ITEMS.find((item) => item.title === "Published Builds")?.to,
    ).toBe("/builds");
  });
});

describe("PublicBuilds page", () => {
  it("renders published cards that open the existing shared build route", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/builds", component: PublicBuilds },
        { path: "/b/:code", component: { template: "<div />" }, name: "shared-build" },
      ],
    });
    await router.push("/builds");
    await router.isReady();
    const wrapper = mount(PublicBuilds, {
      global: {
        plugins: [router, createVuetify()],
        stubs: {
          AppBreadcrumbs: true,
          VImg: true,
        },
      },
    });
    await nextTick();
    expect(wrapper.text()).toContain("Yeager Energy");
    expect(wrapper.text()).toContain("Alpha Strike");
    expect(wrapper.text()).toContain("2 published");
    const links = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(links).toContain("/b/pub1");
    expect(links).toContain("/b/pub0");
  });
});
