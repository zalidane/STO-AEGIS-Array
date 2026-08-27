import { createRouter, createWebHistory } from "vue-router";

import Home from "@/views/Home.vue";
import Search from "@/views/Search.vue";
import Collection from "@/views/Collection.vue";
import Loadouts from "@/views/Loadouts.vue";
import Ships from "@/views/Ships.vue";
import ShipDetails from "@/views/ShipDetails.vue";
import LoadoutBuilder from "@/views/LoadoutBuilder.vue";
import Traits from "@/views/Traits.vue";
import TraitDetails from "@/views/TraitDetails.vue";
import StarshipTraits from "@/views/StarshipTraits.vue";
import StarshipTraitDetails from "@/views/StarshipTraitDetails.vue";
import TraySkills from "@/views/TraySkills.vue";
import TraySkillDetails from "@/views/TraySkillDetails.vue";
import Masteries from "@/views/Masteries.vue";
import MasteryDetails from "@/views/MasteryDetails.vue";
import Reputations from "@/views/Reputations.vue";
import ReputationDetails from "@/views/ReputationDetails.vue";
import Modifiers from "@/views/Modifiers.vue";
import ModifierDetails from "@/views/ModifierDetails.vue";
import InfoboxDetails from "@/views/InfoboxDetails.vue";
import Items from "@/views/Items.vue";
import ShipTypes from "@/views/ShipTypes.vue";
import ShipTypeDetails from "@/views/ShipTypeDetails.vue";
import Attributions from "@/views/Attributions.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, top: 80 };
    return { top: 0 };
  },
  routes: [
    { path: "/", component: Home },
    {
      path: "/collection",
      name: "collection",
      component: Collection,
      meta: { breadcrumb: "Collection" },
    },
    {
      path: "/loadouts",
      name: "loadouts",
      component: Loadouts,
      meta: { breadcrumb: "Loadouts" },
    },
    {
      path: "/search",
      component: Search,
      meta: { breadcrumb: "Search" },
    },
    {
      path: "/ships",
      name: "ships",
      component: Ships,
      meta: { breadcrumb: "Ships" },
    },
    {
      path: "/ships/:id",
      name: "ship-details",
      component: ShipDetails,
      meta: { breadcrumb: "Ship Details", parent: "/ships" },
    },
    {
      path: "/ships/:id/loadout",
      name: "ship-loadout",
      component: LoadoutBuilder,
      meta: { breadcrumb: "Loadout", parent: "/ships" },
    },
    {
      path: "/traits",
      name: "traits",
      component: Traits,
      meta: { breadcrumb: "Traits" },
    },
    {
      path: "/traits/:id",
      name: "trait-details",
      component: TraitDetails,
      meta: { breadcrumb: "Trait Details", parent: "/traits" },
    },
    {
      path: "/starship-traits",
      name: "starship-traits",
      component: StarshipTraits,
      meta: { breadcrumb: "Starship Traits" },
    },
    {
      path: "/starship-traits/:id",
      name: "starship-trait-details",
      component: StarshipTraitDetails,
      meta: { breadcrumb: "Starship Trait Details", parent: "/starship-traits" },
    },
    {
      path: "/tray-skills",
      name: "tray-skills",
      component: TraySkills,
      meta: { breadcrumb: "Tray Skills" },
    },
    {
      path: "/tray-skills/:id",
      name: "tray-skill-details",
      component: TraySkillDetails,
      meta: { breadcrumb: "Tray Skill Details", parent: "/tray-skills" },
    },
    {
      path: "/masteries",
      name: "masteries",
      component: Masteries,
      meta: { breadcrumb: "Masteries" },
    },
    {
      path: "/masteries/:id",
      name: "mastery-details",
      component: MasteryDetails,
      meta: { breadcrumb: "Mastery Details", parent: "/masteries" },
    },
    {
      path: "/reputations",
      name: "reputations",
      component: Reputations,
      meta: { breadcrumb: "Reputations" },
    },
    {
      path: "/reputations/:id",
      name: "reputation-details",
      component: ReputationDetails,
      meta: { breadcrumb: "Reputation Details", parent: "/reputations" },
    },
    {
      path: "/modifiers",
      name: "modifiers",
      component: Modifiers,
      meta: { breadcrumb: "Modifiers" },
    },
    {
      path: "/modifiers/:id",
      name: "modifier-details",
      component: ModifierDetails,
      meta: { breadcrumb: "Modifier Details", parent: "/modifiers" },
    },
    {
      path: "/items",
      name: "items",
      component: Items,
      meta: { breadcrumb: "Items" },
    },
    {
      path: "/items/:id",
      name: "item-details",
      component: InfoboxDetails,
      meta: { breadcrumb: "Item Details", parent: "/items" },
    },
    {
      path: "/infoboxes",
      redirect: "/items",
    },
    {
      path: "/infoboxes/:id",
      name: "infobox-details",
      component: InfoboxDetails,
      meta: { breadcrumb: "Item Details", parent: "/items" },
    },
    {
      path: "/ship-types",
      name: "ship-types",
      component: ShipTypes,
      meta: { breadcrumb: "Ship Types" },
    },
    {
      path: "/ship-types/:id",
      name: "ship-type-details",
      component: ShipTypeDetails,
      meta: { breadcrumb: "Ship Type Details", parent: "/ship-types" },
    },
    {
      path: "/attributions",
      name: "attributions",
      component: Attributions,
      meta: { breadcrumb: "Attributions" },
    },
  ],
});

export default router;
