import { describe, expect, it, vi } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createVuetify } from "vuetify";
import Reputations from "@/views/Reputations.vue";

const vuetify = createVuetify();

vi.mock("@vue/apollo-composable", async () => {
  const { ref } = await import("vue");
  return {
    useQuery: () => ({
      result: ref({
        reputations: [
          {
            id: 1,
            name: "Task Force Omega",
            color1: null,
            color2: null,
            icon: null,
            link: null,
            description: "Omega",
            released: "Season Seven",
            environment: null,
            boff: null,
            secondary: null,
          },
          {
            id: 2,
            name: "Pilot",
            color1: null,
            color2: null,
            icon: null,
            link: null,
            description: "Maneuvers",
            released: "Delta Rising",
            environment: "space",
            boff: true,
            secondary: null,
          },
        ],
      }),
      loading: ref(false),
      error: ref(null),
    }),
  };
});

describe("Reputations browser", () => {
  it("splits reputations and specializations and renames the page", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/reputations",
          component: Reputations,
          meta: { breadcrumb: "Reputations and Specializations" },
        },
        { path: "/reputations/:id", component: { template: "<div />" } },
      ],
    });
    await router.push("/reputations");
    await router.isReady();

    const wrapper = mount(Reputations, {
      global: { plugins: [router, vuetify] },
    });

    expect(wrapper.text()).toContain("Reputations and Specializations");
    expect(wrapper.text()).toContain("Task Force Omega");
    expect(wrapper.text()).not.toContain("Pilot");

    const specializations = wrapper
      .findAll(".v-tab")
      .find((node) => node.text().includes("Specializations"));
    expect(specializations).toBeTruthy();
    await specializations!.trigger("click");

    expect(wrapper.text()).toContain("Pilot");
    expect(wrapper.text()).not.toContain("Task Force Omega");
  });
});