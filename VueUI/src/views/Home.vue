<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const searchText = ref("");

function search() {
  router.push({
    path: "/search",
    query: {
      q: searchText.value,
    },
  });
}
</script>

<template>
  <v-sheet class="hero-section pa-10 mb-8" rounded="x1">
    <h1 class="text-h2 font-weight-bold">STO-AEGIS Array</h1>

    <p class="text-h6 text-medium-emphasis">
      Explore ships, traits, consoles, abd more for the game Star Trek Online
    </p>

    <v-text-field
      v-model="searchText"
      prepend-inner-icon="mdi-magnify"
      label="Search STO-AEGIS"
      @keydown.enter="search"
    />
  </v-sheet>

  <v-row>
    <v-col cols="12" md="4">
      <v-card height="200" to="/ships" hover>
        <v-card-title>Ships</v-card-title>
        <v-card-text>Browse all available ships and their details</v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="4">
      <v-card height="200" to="/traits" hover>
        <v-card-title>Traits</v-card-title>
        <v-card-text>Explore Personal Space and Ground traits</v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="4">
      <v-card height="200" to="/starship-traits" hover>
        <v-card-title>Starship Traits</v-card-title>
        <v-card-text>Browse Starship Traits</v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, #182235, #0f252b);
}
</style>
