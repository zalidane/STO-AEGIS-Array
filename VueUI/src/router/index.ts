import { createRouter, createWebHistory } from "vue-router";

import Ships from "../views/Ships.vue";
import Traits from "../views/Traits.vue";
import StarshipTraits from "@/views/StarshipTraits.vue";
import ShipDetails from "@/views/ShipDetails.vue";
import Home from "@/views/Home.vue";
import Search from "@/views/Search.vue";
import Masteries from "@/views/Masteries.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: Home,
    },
    {
      path: "/ships",
      name: "ships",
      component: Ships,
      meta: {
        breadcrumb: "Ships",
      },
    },
    {
      path: "/ships/:id",
      name: "ship-details",
      component: ShipDetails,
      meta: {
        breadcrumb: "Ship Details",
        parent: "/ships",
      },
    },
    {
      path: "/traits",
      name: "traits",
      component: Traits,
      meta: {
        breadcrumb: "Traits",
      },
    },
    {
      path: "/traits/:id",
      name: "trait-details",
      component: Traits,
      meta: {
        breadcrumb: "Trait Details",
        parent: "/traits",
      },
    },
    {
      path: "/starship-traits",
      name: "starship-traits",
      component: StarshipTraits,
      meta: {
        breadcrumb: "Starship Traits",
      },
    },
    {
      path: "/starship-traits/:id",
      name: "starship-trait-details",
      component: StarshipTraits,
      meta: {
        breadcrumb: "Starship Traits",
        parent: "/starship-traits",
      },
    },
    {
      path: "/tray-skills",
      name: "tray-skills",
      component: Ships,
      meta: {
        breadcrumb: "Tray Skills",
      },
    },
    {
      path: "/tray-skills/:id",
      name: "tray-skill-details",
      component: Ships,
      meta: {
        breadcrumb: "Tray Skills",
        parent: "/tray-skills",
      },
    },
    {
      path: "/masteries",
      name: "masteries",
      component: Masteries,
      meta: {
        breadcrumb: "Masteries",
      },
    },
    {
      path: "/masteries/:id",
      name: "mastery-details",
      component: Ships,
      meta: {
        breadcrumb: "TMastery Details",
        parent: "/mastery-details",
      },
    },
    {
      path: "/reputations",
      name: "reputations",
      component: Ships,
      meta: {
        breadcrumb: "Reputations",
      },
    },
    {
      path: "/reputations/:id",
      name: "reputation-details",
      component: Ships,
      meta: {
        breadcrumb: "Reputation Details",
        parent: "/reputation-details",
      },
    },
    {
      path: "/search",
      component: Search,
      meta: {
        breadcrumb: "Search",
      },
    },
  ],
});

export default router;
