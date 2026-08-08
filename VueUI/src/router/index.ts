import { createRouter, createWebHistory } from "vue-router";

import Home from "@/views/Home.vue";
import Search from "@/views/Search.vue";
import Ships from "@/views/Ships.vue";
import ShipDetails from "@/views/ShipDetails.vue";
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
import SetBonuses from "@/views/SetBonuses.vue";
import SetBonusDetails from "@/views/SetBonusDetails.vue";
import Modifiers from "@/views/Modifiers.vue";
import ModifierDetails from "@/views/ModifierDetails.vue";
import Infoboxes from "@/views/Infoboxes.vue";
import InfoboxDetails from "@/views/InfoboxDetails.vue";
import GwObtains from "@/views/GwObtains.vue";
import GwObtainDetails from "@/views/GwObtainDetails.vue";
import SwObtains from "@/views/SwObtains.vue";
import SwObtainDetails from "@/views/SwObtainDetails.vue";
import ShipTypes from "@/views/ShipTypes.vue";
import ShipTypeDetails from "@/views/ShipTypeDetails.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: Home },
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
      path: "/set-bonuses",
      name: "set-bonuses",
      component: SetBonuses,
      meta: { breadcrumb: "Set Bonuses" },
    },
    {
      path: "/set-bonuses/:id",
      name: "set-bonus-details",
      component: SetBonusDetails,
      meta: { breadcrumb: "Set Bonus Details", parent: "/set-bonuses" },
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
      path: "/infoboxes",
      name: "infoboxes",
      component: Infoboxes,
      meta: { breadcrumb: "Infoboxes" },
    },
    {
      path: "/infoboxes/:id",
      name: "infobox-details",
      component: InfoboxDetails,
      meta: { breadcrumb: "Infobox Details", parent: "/infoboxes" },
    },
    {
      path: "/gw-obtains",
      name: "gw-obtains",
      component: GwObtains,
      meta: { breadcrumb: "Ground Obtains" },
    },
    {
      path: "/gw-obtains/:id",
      name: "gw-obtain-details",
      component: GwObtainDetails,
      meta: { breadcrumb: "Ground Obtain Details", parent: "/gw-obtains" },
    },
    {
      path: "/sw-obtains",
      name: "sw-obtains",
      component: SwObtains,
      meta: { breadcrumb: "Space Obtains" },
    },
    {
      path: "/sw-obtains/:id",
      name: "sw-obtain-details",
      component: SwObtainDetails,
      meta: { breadcrumb: "Space Obtain Details", parent: "/sw-obtains" },
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
  ],
});

export default router;
