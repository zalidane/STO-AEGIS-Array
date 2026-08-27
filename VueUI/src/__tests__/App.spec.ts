import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

import App from "../App.vue";
import { FOOTER_SUMMARY } from "@/logic/attribution";

describe("App", () => {
  it("renders the brand and wiki attribution footer", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    await router.isReady();

    const vuetify = createVuetify({ components, directives });
    const wrapper = mount(App, {
      global: {
        plugins: [router, vuetify],
        stubs: {
          AppNavigation: true,
          CharacterSwitcher: true,
        },
      },
    });

    expect(wrapper.text()).toContain("STO-AEGIS Array");
    expect(wrapper.text()).toContain(FOOTER_SUMMARY);
    expect(wrapper.text()).toContain("Full attributions");
  });
});
