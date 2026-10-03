import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import SlotSuffixModifiers from "@/components/loadout/SlotSuffixModifiers.vue";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
vi.stubGlobal("visualViewport", {
  addEventListener() {},
  removeEventListener() {},
  width: 1024,
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  scale: 1,
});

const vuetify = createVuetify();

const sockets = [
  {
    index: 0,
    value: "",
    options: [
      {
        token: "[A->E]",
        stats:
          "Adds 7.5% of your Auxiliary power to your Engine Power as bonus Power",
        unique: false,
        epic: false,
      },
      {
        token: "[A->S]",
        stats:
          "Adds 7.5% of your Auxiliary power to your Shield Power as bonus Power",
        unique: false,
        epic: false,
      },
      {
        token: "[CrtH]",
        stats: "+2% Critical Chance",
        unique: false,
        epic: false,
      },
    ],
  },
];

function menuText(): string {
  return document.body.querySelector(".suffix-menu")?.textContent ?? "";
}

describe("SlotSuffixModifiers search", () => {
  it("shows the unfiltered list after the clear control emits null", async () => {
    const wrapper = mount(SlotSuffixModifiers, {
      props: { sockets, ariaPrefix: "Fore weapon" },
      attachTo: document.body,
      global: { plugins: [vuetify] },
    });

    await wrapper.get("button.equip-mod").trigger("click");
    await flushPromises();

    const input = document.body.querySelector<HTMLInputElement>(
      ".suffix-menu input",
    );
    expect(input).toBeTruthy();
    input!.value = "as";
    input!.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();

    expect(menuText()).toContain("[A->E]");
    expect(menuText()).toContain("[A->S]");
    expect(menuText()).not.toContain("[CrtH]");

    const clear = document.body.querySelector<HTMLElement>(
      ".suffix-menu .v-field__clearable .v-icon",
    );
    expect(clear).toBeTruthy();
    clear!.click();
    await flushPromises();

    expect(menuText()).toContain("None");
    expect(menuText()).toContain("[A->E]");
    expect(menuText()).toContain("[A->S]");
    expect(menuText()).toContain("[CrtH]");
    expect(menuText()).not.toContain("No modifiers match.");
    expect(input!.value).toBe("");

    wrapper.unmount();
  });
});
