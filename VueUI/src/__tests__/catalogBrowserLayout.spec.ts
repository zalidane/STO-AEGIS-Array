import { describe, expect, it, vi } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import TraitBrowserLayout from "@/components/traits/TraitBrowserLayout.vue";
import type { TraitBrowserItem } from "@/logic/traitBrowser";

const vuetify = createVuetify();

function skill(
  id: number,
  name: string,
  type: string,
  environment: string,
): TraitBrowserItem {
  return {
    id,
    name,
    listDescription: `${name} summary that should stay in the tray list`,
    detailDescription: `${name} summary that should stay in the tray list`,
    source: null,
    type,
    environment,
    career: null,
    imageSrc: `/images/tray-skills/${id}.png`,
  };
}

const skills = [
  skill(1, "Beams: Fire at Will", "Tactical", "Space"),
  skill(2, "Security Escort", "Tactical", "Ground"),
  skill(3, "Pilot Team", "Pilot", "Space"),
];

function mountBrowser(
  props: Record<string, unknown> = {},
) {
  return mount(TraitBrowserLayout, {
    props: {
      title: "Tray Skills",
      items: skills,
      tabFacets: "type-and-region",
      emptyNoun: "skills",
      ...props,
    },
    global: { plugins: [createPinia(), vuetify] },
  });
}

function tab(wrapper: ReturnType<typeof mountBrowser>, label: string) {
  const match = wrapper
    .findAll(".v-tab")
    .find((node) => node.text().includes(label));
  if (!match) throw new Error(`Missing tab ${label}`);
  return match;
}

describe("TraitBrowserLayout tabs", () => {
  it("shows skill icons and filters by type then region", async () => {
    const wrapper = mountBrowser();

    expect(wrapper.find('img[alt="Pilot Team"]').attributes("src")).toBe(
      "/images/tray-skills/3.png",
    );
    expect(wrapper.text()).toContain("Pilot Team summary");
    expect(wrapper.text()).not.toContain("Beams: Fire at Will");

    await tab(wrapper, "Ground").trigger("click");
    expect(wrapper.text()).toContain("No skills in Pilot · Ground.");
    expect(wrapper.text()).not.toContain("Pilot Team");

    await tab(wrapper, "Tactical").trigger("click");
    expect(wrapper.text()).toContain("Security Escort");
    expect(wrapper.text()).not.toContain("Pilot Team");
  });

  it("hides the sidebar description for items and filters by type", async () => {
    const items: TraitBrowserItem[] = [
      {
        ...skill(10, "Sticky Web", "Universal Console", "Character"),
        listDescription: "Secret console description",
      },
      {
        ...skill(11, "Phaser Beam Array", "Ship Weapon", "Character"),
        listDescription: "Beam description",
      },
    ];
    const wrapper = mountBrowser({
      title: "Items",
      items,
      tabFacets: "type",
      hideListDescription: true,
      hideDetailBody: true,
      emptyNoun: "items",
    });

    expect(wrapper.text()).not.toContain("Secret console description");
    expect(wrapper.text()).toContain("Phaser Beam Array");
    await tab(wrapper, "Universal Console").trigger("click");
    expect(wrapper.text()).toContain("Sticky Web");
    expect(wrapper.text()).not.toContain("Phaser Beam Array");
    expect(wrapper.text()).not.toContain("Secret console description");
  });
});
