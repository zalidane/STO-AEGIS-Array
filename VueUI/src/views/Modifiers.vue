<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  ModifiersDocument,
  type ModifiersQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();
type Modifier = ModifiersQuery["modifiers"][number];

const { result, loading, error } = useQuery(ModifiersDocument);
const items = computed<Modifier[]>(() => result.value?.modifiers ?? []);
const search = ref("");
const headers = [
  { title: "Modifier", key: "modifier" },
  { title: "Type", key: "type" },
  { title: "Stats", key: "stats" },
  { title: "Available", key: "available" },
  { title: "Unique", key: "isunique" },
  { title: "Epic", key: "isepic" },
];

function onRowClick(_event: Event, row: { item: Modifier }) {
  router.push(`/modifiers/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Modifiers</h1>
    <loading-panel v-if="loading" :message="'Modifiers'" />
    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>
    <div v-else>
      <v-text-field v-model="search" label="Search" class="mb-4" />
      <v-data-table
        :items="items"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        @click:row="onRowClick"
      />
    </div>
  </v-container>
</template>
