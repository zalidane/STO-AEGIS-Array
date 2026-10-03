import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createVuetify } from "vuetify";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import { setCollectionRepository } from "@/models/collection";
import {
  createLocalStorageCollectionRepository,
  createMemoryCollectionRepository,
} from "@/models/collection/localStorageRepository";
import type { CollectionState } from "@/logic/collection/types";
import { useCollectionStore } from "@/stores/collection";

const vuetify = createVuetify();

function twoCaptainState(): CollectionState {
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
      {
        id: "antonel",
        name: "Antonel Darksky",
        createdAt: "2026-08-22T00:00:00.000Z",
        accountId: "pc",
        traitSlots: [],
      },
    ],
    entries: [
      {
        id: "account-hull",
        characterId: "antonel",
        kind: "ship",
        catalogId: 10,
        collectedAt: "2026-08-22T00:00:00.000Z",
        bind: "account",
      },
      {
        id: "captain-hull",
        characterId: "antonel",
        kind: "ship",
        catalogId: 11,
        collectedAt: "2026-08-22T00:00:00.000Z",
        bind: "character",
      },
    ],
    loadouts: [],
  };
}

function mountToggle(
  props: Record<string, unknown>,
  state: CollectionState = twoCaptainState(),
) {
  setCollectionRepository(createMemoryCollectionRepository(state));
  const pinia = createPinia();
  setActivePinia(pinia);
  const wrapper = mount(CollectToggle, {
    props: {
      kind: "ship",
      catalogId: 10,
      bind: "account",
      ...props,
    },
    global: { plugins: [pinia, vuetify] },
  });
  return { wrapper, store: useCollectionStore() };
}

afterEach(() => {
  setCollectionRepository(createLocalStorageCollectionRepository());
});

describe("CollectToggle account-wide ships", () => {
  it("shows another captain's account hull as collected on the ship browser", () => {
    const { wrapper } = mountToggle({ accountWide: true, compact: true });
    const button = wrapper.get("button");

    expect(button.text()).toContain("Collected");
    expect(button.classes()).toContain("v-btn--variant-flat");
    expect(button.attributes("aria-label")).toBe(
      "Collected. Unlocked for account. On Antonel Darksky",
    );
  });

  it("leaves the collection row on this captain's own copy", () => {
    const { wrapper } = mountToggle({ compact: false });
    const button = wrapper.get(".v-btn");

    expect(button.text()).toContain("Collect");
    expect(button.classes()).toContain("v-btn--variant-outlined");
    expect(wrapper.text()).toContain("On Antonel Darksky");
  });

  it("does not collect a second copy when the account already unlocked the hull", async () => {
    const { wrapper, store } = mountToggle({ accountWide: true, compact: true });

    await wrapper.get("button").trigger("click");

    expect(store.state.entries).toHaveLength(2);
    expect(wrapper.get("button").text()).toContain("Collected");
  });

  it("keeps a character-bound hull off the other captain", () => {
    const { wrapper } = mountToggle({
      accountWide: true,
      compact: true,
      catalogId: 11,
      bind: "character",
    });

    expect(wrapper.get("button").text()).toContain("Collect");
    expect(wrapper.get("button").classes()).toContain("v-btn--variant-outlined");
  });

  it("still uncollects the captain who owns the account hull", async () => {
    const state = twoCaptainState();
    state.activeCharacterId = "antonel";
    const { wrapper, store } = mountToggle(
      { accountWide: true, compact: true },
      state,
    );

    expect(wrapper.get("button").text()).toContain("Collected");
    await wrapper.get("button").trigger("click");

    expect(store.state.entries.map((entry) => entry.id)).toEqual([
      "captain-hull",
    ]);
    expect(wrapper.get("button").text()).toContain("Collect");
  });
});
