<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  ShipTypesDocument,
  type ShipTypesQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();
type ShipType = ShipTypesQuery["shipTypes"][number];

const { result, loading, error } = useQuery(ShipTypesDocument);
const items = computed<ShipType[]>(() => result.value?.shipTypes ?? []);
const search = ref("");
const headers = [{ title: "Name", key: "name" }];

function onRowClick(_event: Event, row: { item: ShipType }) {
  router.push(`/ship-types/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Ship Types</h1>
    <loading-panel v-if="loading" :message="'Ship Types'" />
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
