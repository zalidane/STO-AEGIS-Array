import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";

import AppFooter from "../components/layout/AppFooter.vue";
import { FOOTER_SUMMARY } from "@/logic/attribution";

describe("AppFooter", () => {
  it("renders wiki attribution summary and license links", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/attributions", component: { template: "<div />" } }],
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(AppFooter, {
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain(FOOTER_SUMMARY);
    expect(wrapper.text()).toContain("Full attributions");
    expect(wrapper.find('a[href="https://stowiki.net/"]').exists()).toBe(true);
    expect(
      wrapper
        .find('a[href="https://creativecommons.org/licenses/by-nc-sa/3.0/"]')
        .exists(),
    ).toBe(true);
    expect(wrapper.find('a[href="/attributions"]').exists()).toBe(true);
  });
});
