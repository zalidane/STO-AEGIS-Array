<script setup lang="ts">
const items = [
  {
    title: "Home",
    icon: "mdi-home",
    to: "/",
  },
  {
    title: "Ships",
    icon: "mdi-ferry",
    to: "/ships",
  },
  {
    title: "Traits",
    icon: "mdi-star-outline",
    to: "/traits",
  },
  {
    title: "Starship Traits",
    icon: "mdi-star",
    to: "/starship-traits",
  },
];

const comingSoonItems = [
  { title: "Reputations" },
  { title: "Set Bonuses" },
  { title: "Tray Skills" },
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

    <v-list>
      <v-list-subheader title="Coming Soon" />

      <v-list-item
        v-for="item in comingSoonItems"
        :key="item.title"
        :title="item.title"
        :prepend-icon="'mdi-alert-circle-outline'"
      >
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>
