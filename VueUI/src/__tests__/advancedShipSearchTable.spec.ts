import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import AdvancedShipSearch from "@/views/AdvancedShipSearch.vue";
import { useCollectionStore } from "@/stores/collection";

const vuetify = createVuetify();

const ships = vi.hoisted(() => [
  {
    id: 1,
    name: "Experimental Hull",
    foreWeapons: 5,
    aftWeapons: 2,
    experimental: true,
    equipCannons: true,
    secondaryDeflector: false,
    hangars: 0,
    tacticalSlots: 3,
    engineeringSlots: 5,
    scienceSlots: 2,
    t5uConsole: null,
    boffs: "Commander Tactical-Miracle Worker",
    cost: "3000;Zen",
    faction: "United Federation of Planets",
    factionLede: "Federation",
    tier: 5,
    abilities: "Enhanced Battle Cloak,Raider Flanking",
  },
  {
    id: 2,
    name: "Standard Hull",
    foreWeapons: 4,
    aftWeapons: 3,
    experimental: false,
    equipCannons: false,
    secondaryDeflector: true,
    hangars: 1,
    tacticalSlots: 0,
    engineeringSlots: 4,
    scienceSlots: 0,
    t5uConsole: null,
    boffs: "Commander Engineering",
    cost: null,
    faction: "Klingon Empire",
    factionLede: "Klingon",
    tier: 5,
    abilities: "Cloak,Raider Flanking",
  },
]);

vi.mock("@vue/apollo-composable", async () => {
  const { ref } = await import("vue");
  return {
    useQuery: () => ({
      result: ref({ ships }),
      loading: ref(false),
      error: ref(null),
    }),
  };
});

async function mountSearch() {
  localStorage.clear();
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/ships", component: { template: "<div />" } },
      { path: "/ships/advanced", component: { template: "<div />" } },
      { path: "/ships/:id", component: { template: "<div />" } },
    ],
  });
  await router.push("/ships/advanced");
  await router.isReady();
  return mount(AdvancedShipSearch, {
    global: { plugins: [pinia, router, vuetify] },
  });
}

async function clickSwitch(node: { element: Element }) {
  node.element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }),
  );
  await nextTick();
}

describe("Advanced Ship Search results table", () => {
  it("shows one fore/aft/experimental column and short console labels", async () => {
    const wrapper = await mountSearch();

    const headers = wrapper.findAll("th").map((header) => header.text().trim());
    expect(headers).toContain("Fore/Aft/Exp");
    expect(headers).toContain("Consoles");
    expect(headers).toContain("Total Weapons");
    expect(headers).toContain("Full-spec");
    expect(headers).toContain("Sec. def");
    expect(headers).toContain("Hangars");
    expect(headers).toContain("Dual cannons");
    expect(headers).toContain("Acquisition");
    expect(headers).toContain("Faction");
    expect(headers).toContain("Fleet avail.");
    expect(headers).toContain("Collected");
    expect(headers).not.toContain("Fore");
    expect(headers).not.toContain("Aft");
    expect(headers).not.toContain("Exp");

    const cells = wrapper.findAll("tbody td").map((cell) => cell.text().trim());
    expect(cells).toContain("5/2/1");
    expect(cells).toContain("4/3/0");
    expect(cells).toContain("5 E | 2 S | 3 T | 1 U");
    expect(cells).toContain("4 E");
    expect(cells).toContain("8");
    expect(cells).toContain("7");
    const tableText = cells.join("\n");
    expect(tableText).not.toContain("x ENG");
    expect(tableText).not.toContain("UNI");
    expect(tableText).toContain("Yes");
    expect(tableText).toContain("No");
  });

  it("sorts the weapons column by fore, then aft, then experimental", async () => {
    const wrapper = await mountSearch();
    const header = wrapper
      .findAll("th")
      .find((cell) => cell.text().includes("Fore/Aft/Exp"));
    expect(header).toBeTruthy();
    await header!.trigger("click");

    const names = wrapper.findAll("tbody tr").map((row) => {
      return row.find(".adv-table__name").text();
    });
    expect(names).toEqual(["Standard Hull", "Experimental Hull"]);
  });

  it("toggles presence filters without excluding hulls while off", async () => {
    const wrapper = await mountSearch();
    const names = () =>
      wrapper.findAll(".adv-table__name").map((node) => node.text());
    const switches = wrapper.findAll(".adv-switch");
    expect(switches.map((node) => node.text())).toEqual([
      "Secondary deflector",
      "Dual cannons",
      "Fleet version available",
    ]);
    for (const node of switches) {
      expect(node.attributes("role")).toBe("switch");
      expect(node.attributes("type")).toBe("button");
      expect(node.attributes("aria-checked")).toBe("false");
    }
    expect(names().sort()).toEqual(["Experimental Hull", "Standard Hull"]);

    const secondary = switches[0]!;
    await clickSwitch(secondary);
    expect(secondary.attributes("aria-checked")).toBe("true");
    expect(names()).toEqual(["Standard Hull"]);

    await secondary.trigger("keydown", { key: "Enter" });
    expect(secondary.attributes("aria-checked")).toBe("false");
    expect(names().sort()).toEqual(["Experimental Hull", "Standard Hull"]);

    await secondary.trigger("keydown", { key: " " });
    expect(secondary.attributes("aria-checked")).toBe("true");
    expect(names()).toEqual(["Standard Hull"]);

    await secondary.trigger("keydown", { key: "Tab" });
    expect(secondary.attributes("aria-checked")).toBe("true");
    await clickSwitch(secondary);
    expect(names().sort()).toEqual(["Experimental Hull", "Standard Hull"]);

    const cannons = wrapper
      .findAll(".adv-switch")
      .find((node) => node.text() === "Dual cannons");
    expect(cannons).toBeTruthy();
    await clickSwitch(cannons!);
    expect(cannons!.attributes("aria-checked")).toBe("true");
    expect(names()).toEqual(["Experimental Hull"]);

    const cloak = wrapper
      .findAll(".adv-chip")
      .find((node) => node.text() === "Battle Cloak");
    expect(cloak).toBeTruthy();
  });

  it("filters the table by cloak type", async () => {
    const wrapper = await mountSearch();
    const chip = wrapper
      .findAll(".adv-chip")
      .find((node) => node.text() === "Enhanced Battle Cloak");
    expect(chip).toBeTruthy();
    await chip!.trigger("click");
    const names = wrapper.findAll(".adv-table__name").map((node) => node.text());
    expect(names).toEqual(["Experimental Hull"]);
  });

  it("shows whether the active account has collected each hull", async () => {
    const wrapper = await mountSearch();
    const store = useCollectionStore();
    store.addCharacter("Alice");
    store.collect("ship", 1, "account");
    store.collect("ship", 2, "character");
    store.addCharacter("Bob");
    store.collect("ship", 2, "character");
    await wrapper.vm.$nextTick();

    const cells = wrapper.findAll("tbody td").map((cell) => cell.text().trim());
    expect(cells).toContain("Collected: Account");
    expect(cells).toContain("Collected: Alice, Bob");
  });
});
