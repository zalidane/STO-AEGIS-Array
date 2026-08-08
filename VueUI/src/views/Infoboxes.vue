<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  InfoboxesDocument,
  type InfoboxesQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();
type Infobox = InfoboxesQuery["infoboxes"][number];

const { result, loading, error } = useQuery(InfoboxesDocument);
const items = computed<Infobox[]>(() => result.value?.infoboxes ?? []);
const search = ref("");
const headers = [
  { title: "Name", key: "name" },
  { title: "Rarity", key: "rarity" },
  { title: "Type", key: "type" },
  { title: "Who", key: "who" },
  { title: "Bound To", key: "boundto" },
  { title: "Bound When", key: "boundwhen" },
  { title: "Equip Limit", key: "equiplimit" },
];

function onRowClick(_event: Event, row: { item: Infobox }) {
  router.push(`/infoboxes/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Infoboxes</h1>
    <loading-panel v-if="loading" :message="'Infoboxes'" />
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
