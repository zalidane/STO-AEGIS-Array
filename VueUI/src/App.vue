<script setup lang="ts">
import { RouterLink } from "vue-router";

import AppNavigation from "./components/layout/AppNavigation.vue";
</script>

<template>
  <v-app style="background: linear-gradient(to bottom, #07121f, #020914)">
    <AppNavigation />

    <v-app-bar color="surface">
      <v-app-bar-title>
        <RouterLink to="/" class="text-decoration-none text-white">
          STO-AEGIS Array
        </RouterLink>
      </v-app-bar-title>

      <v-spacer />
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped></style>
