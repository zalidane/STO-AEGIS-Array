<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { ShipsDocument } from "@/graphql/generated/graphql";
import type { ShipsQuery } from "@/graphql/generated/graphql";

const router = useRouter();

type Ship = ShipsQuery["ships"][number];

const { result, loading, error } = useQuery(ShipsDocument);
const ships = computed<Ship[]>(() => result.value?.ships ?? []);
const search = ref("");
const headers = [
  { title: "Name", key: "name" },
  { title: "Type", key: "type" },
];

function onRowClick(_event: Event, row: { item: Ship }) {
  console.log(row.item);
  router.push(`/ships/${row.item.id}`);
}
</script>

<template>
  <v-container>
    <h1 class="mb-4">Ships</h1>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <div v-else>
      <v-text-field v-model="search" label="Search" />

      <v-data-table
        :items="ships ?? []"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        @click:row="onRowClick"
      >
      </v-data-table>
    </div>
  </v-container>
</template>
