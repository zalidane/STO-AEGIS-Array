<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCompareStore } from "@/stores/compare";

const compare = useCompareStore();
const { count, path } = storeToRefs(compare);

const items = [
  { title: "Home", icon: "mdi-home", to: "/" },
  { title: "Collection", icon: "mdi-bookmark", to: "/collection" },
  { title: "Loadouts", icon: "mdi-view-dashboard-outline", to: "/loadouts" },
  { title: "Ships", icon: "mdi-ferry", to: "/ships" },
  { title: "Compare", icon: "mdi-compare-horizontal", to: "compare" },
  { title: "Ship Types", icon: "mdi-shape", to: "/ship-types" },
  { title: "Traits", icon: "mdi-star-outline", to: "/traits" },
  { title: "Starship Traits", icon: "mdi-star", to: "/starship-traits" },
  { title: "Items", icon: "mdi-cube-outline", to: "/items" },
  { title: "Tray Skills", icon: "mdi-lightning-bolt", to: "/tray-skills" },
  { title: "Masteries", icon: "mdi-trophy", to: "/masteries" },
  { title: "Reputations", icon: "mdi-medal", to: "/reputations" },
  { title: "Modifiers", icon: "mdi-delta", to: "/modifiers" },
  { title: "Attributions", icon: "mdi-scale-balance", to: "/attributions" },
];

function itemTo(item: (typeof items)[number]): string {
  return item.to === "compare" ? path.value : item.to;
}
</script>

<template>
  <v-navigation-drawer rail expand-on-hover>
    <v-list>
      <v-list-subheader title="STO_AEGIS" />

      <v-list-item
        v-for="item in items"
        :key="item.title"
        :to="itemTo(item)"
        :prepend-icon="item.icon"
        :title="item.title"
        :subtitle="item.to === 'compare' && count > 0 ? `${count} of 2` : undefined"
      />
    </v-list>
  </v-navigation-drawer>
</template>
