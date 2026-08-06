import { createRouter, createWebHistory } from "vue-router";

import Ships from "../views/Ships.vue";
import Traits from "../views/Traits.vue";
import StarshipTraits from "@/views/StarshipTraits.vue";
import ShipDetails from "@/views/ShipDetails.vue";
import Home from "@/views/Home.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: Home,
    },
    {
      path: "/ships",
      component: Ships,
      meta: {
        breadcrumb: "Ships",
      },
    },
    {
      path: "/traits",
      component: Traits,
      meta: {
        breadcrumb: "Traits",
      },
    },
    {
      path: "/starship-traits",
      component: StarshipTraits,
      meta: {
        breadcrumb: "Starship Traits",
      },
    },
    {
      path: "/ships/:id",
      component: ShipDetails,
      meta: {
        breadcrumb: "Ship Details",
        parent: "/ships",
      },
    },
  ],
});

export default router;
