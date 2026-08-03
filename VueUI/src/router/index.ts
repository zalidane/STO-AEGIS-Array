import { createRouter, createWebHistory } from "vue-router";

import Ships from "../views/Ships.vue";
import Traits from "../views/Traits.vue";
import StarshipTraits from "@/views/StarshipTraits.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/ships",
    },
    {
      path: "/ships",
      name: "ships",
      component: Ships,
    },
    {
      path: "/traits",
      name: "traits",
      component: Traits,
    },
    {
      path: "/starshipTraits",
      name: "starshipTraits",
      component: StarshipTraits,
    },
    {
      path: "/ships/:id",
      name: "ship-details",
      component: () => import("@/views/ShipDetails.vue"),
    },
  ],
});

export default router;
