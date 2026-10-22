import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";

import AppFooter from "../components/layout/AppFooter.vue";
import { RAILWAY_HOST_LABEL } from "@/logic/about";

async function mountFooter(railwayReferralCode?: string | null) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/about", component: { template: "<div />" } },
      { path: "/attributions", component: { template: "<div />" } },
    ],
  });
  await router.push("/");
  await router.isReady();

  return mount(AppFooter, {
    props: { railwayReferralCode },
    global: { plugins: [router] },
  });
}

describe("Railway host credit", () => {
  it("hides the section when the referral code is unset, blank, or whitespace", async () => {
    for (const code of [undefined, null, "", "   "]) {
      const wrapper = await mountFooter(code);
      expect(wrapper.find(".app-footer__host").exists()).toBe(false);
      expect(wrapper.text()).not.toContain(RAILWAY_HOST_LABEL);
      expect(wrapper.find('a[href*="railway.com"]').exists()).toBe(false);
    }
  });

  it("shows a Hosted on Railway link built from the code", async () => {
    const wrapper = await mountFooter("  aegis  ");
    const link = wrapper.find(
      'a[href="https://railway.com?referralCode=aegis"]',
    );

    expect(wrapper.find(".app-footer__host").exists()).toBe(true);
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("Hosted on Railway");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });
});
