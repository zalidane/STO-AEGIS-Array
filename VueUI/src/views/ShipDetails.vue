<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useQuery } from "@vue/apollo-composable";
import { ShipDocument, type ShipQuery } from "@/graphql/generated/graphql";

const route = useRoute();

const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(ShipDocument, () => ({
  id: id.value,
}));

type ShipDetail = NonNullable<ShipQuery["ship"]>;

const ship = computed<ShipDetail | null>(() => result.value?.ship ?? null);
</script>

<template>
  <v-container>
    <v-progress-linear v-if="loading" indeterminate />

    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>

    <v-card v-else-if="ship" class="pa-4">
      <v-card-title>{{ ship.name }}</v-card-title>
      <v-card-subtitle>
        Tier {{ ship.tier }} &mdash; {{ ship.type }}</v-card-subtitle
      >
      <v-card-text>
        <p v-if="ship.description">
          {{ ship.description }}
        </p>

        <v-row class="mt-4">
          <v-col cols="12" md="4">
            <strong>Hull</strong>
            <div>{{ ship.hull }}</div>
          </v-col>

          <v-col cols="12" md="4">
            <strong>Turn Rate</strong>
            <div>{{ ship.turnRate }}</div>
          </v-col>

          <v-col cols="12" md="4">
            <strong>Shield Modifier</strong>
            <div>{{ ship.shieldMod }}</div>
          </v-col>

          <v-divider class="my-4" />

          <h3>Universal Console</h3>

          <div v-if="ship.uniConsole">
            {{ ship.uniConsole.name }}
          </div>

          <div v-else>None</div>

          <v-divider class="my-4" />

          <h3>Starship Traits</h3>

          <v-list>
            <v-list-item v-for="trait in ship.starshipTraits" :key="trait.id">
              <v-list-item-title>
                {{ trait.name }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ trait.short }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-row>
      </v-card-text>
    </v-card>

    <v-alert v-else type="warning"> Ship not found </v-alert>
  </v-container>
</template>
