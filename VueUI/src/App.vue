<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <v-app>
    <v-app-bar color="surface">
      <v-app-bar-title>
        <RouterLink to="/" class="text-decoration-none text-white">
          STO-AEGIS Array
        </RouterLink>
      </v-app-bar-title>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped></style>
