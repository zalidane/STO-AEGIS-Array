<script setup lang="ts">
import { RouterLink } from "vue-router";

import AppNavigation from "./components/layout/AppNavigation.vue";
import AppFooter from "./components/layout/AppFooter.vue";
import CharacterSwitcher from "./components/collection/CharacterSwitcher.vue";
import { useSidebarNav } from "./composables/useSidebarNav";

const {
  shellExpanded: sidebarExpanded,
  showNavMenu,
  openOverlayDrawer,
} = useSidebarNav();
</script>

<template>
  <v-app style="background: linear-gradient(to bottom, #07121f, #020914)">
    <AppNavigation />

    <v-app-bar color="surface" class="app-top-bar" flat>
      <v-btn
        v-if="showNavMenu"
        class="app-nav-menu-btn"
        icon="mdi-menu"
        variant="text"
        density="comfortable"
        aria-label="Open navigation"
        @click="openOverlayDrawer"
      />

      <v-app-bar-title v-show="!sidebarExpanded">
        <RouterLink to="/" class="text-decoration-none text-white">
          STO-AEGIS Array
        </RouterLink>
      </v-app-bar-title>

      <v-spacer />
      <CharacterSwitcher />
    </v-app-bar>

    <v-main>
      <router-view v-slot="{ Component }">
        <keep-alive
          :include="['Ships', 'StarshipTraits', 'Traits', 'TraySkills', 'Items']"
        >
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </v-main>

    <AppFooter />
  </v-app>
</template>

<style scoped>
.app-top-bar {
  border-bottom: 1px solid rgba(63, 167, 255, 0.14);
}

.app-nav-menu-btn {
  margin-inline-start: 4px;
}
</style>
