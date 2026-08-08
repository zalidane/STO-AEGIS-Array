<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { TraitsDocument, type TraitsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();

type Trait = TraitsQuery["traits"][number];

const { result, loading, error } = useQuery(TraitsDocument);
const traits = computed<Trait[]>(() => result.value?.traits ?? []);
const search = ref("");
const headers = [
  { title: "Name", key: "name" },
  { title: "Type", key: "type" },
  { title: "Environment", key: "environment" },
  { title: "Short Description", key: "shortDescription" },
  { title: "Career", key: "career" },
  { title: "Source", key: "source" },
];

function onRowClick(_event: Event, row: { item: Trait }) {
  router.push(`/traits/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Traits</h1>

    <loading-panel v-if="loading" :message="'Traits'" />

    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <div v-else>
      <v-text-field v-model="search" label="Search" class="mb-4" />
      <v-data-table
        :items="traits"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        @click:row="onRowClick"
      />
    </div>
  </v-container>
</template>
