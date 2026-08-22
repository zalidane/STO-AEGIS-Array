<script setup lang="ts">
const items = [
  { title: "Home", icon: "mdi-home", to: "/" },
  { title: "Collection", icon: "mdi-bookmark", to: "/collection" },
  { title: "Ships", icon: "mdi-ferry", to: "/ships" },
  { title: "Ship Types", icon: "mdi-shape", to: "/ship-types" },
  { title: "Traits", icon: "mdi-star-outline", to: "/traits" },
  { title: "Starship Traits", icon: "mdi-star", to: "/starship-traits" },
  { title: "Items", icon: "mdi-cube-outline", to: "/items" },
  { title: "Tray Skills", icon: "mdi-lightning-bolt", to: "/tray-skills" },
  { title: "Masteries", icon: "mdi-trophy", to: "/masteries" },
  { title: "Reputations", icon: "mdi-medal", to: "/reputations" },
  {
    title: "Set Bonuses",
    icon: "mdi-chart-bell-curve-cumulative",
    to: "/set-bonuses",
  },
  { title: "Modifiers", icon: "mdi-delta", to: "/modifiers" },
  { title: "Ground Obtains", icon: "mdi-treasure-chest", to: "/gw-obtains" },
  { title: "Space Obtains", icon: "mdi-rocket", to: "/sw-obtains" },
];
</script>

<template>
  <v-navigation-drawer rail expand-on-hover>
    <v-list>
      <v-list-subheader title="STO_AEGIS" />

      <v-list-item
        v-for="item in items"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
      />
    </v-list>
  </v-navigation-drawer>
</template>
