<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  GwObtainsDocument,
  type GwObtainsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();
type Row = GwObtainsQuery["gwObtains"][number];

const { result, loading, error } = useQuery(GwObtainsDocument);
const items = computed<Row[]>(() => result.value?.gwObtains ?? []);
const search = ref("");
const headers = [
  { title: "Category", key: "cat" },
  { title: "Type", key: "type" },
  { title: "Flavor", key: "flavor" },
  { title: "Box", key: "box" },
  { title: "LB", key: "lb" },
  { title: "Rep", key: "rep" },
];

function onRowClick(_event: Event, row: { item: Row }) {
  router.push(`/gw-obtains/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Ground Obtains</h1>
    <loading-panel v-if="loading" :message="'Ground Obtains'" />
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
