<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { MasteriesDocument, ShipsDocument } from "@/graphql/generated/graphql";
import type { MasteriesQuery, ShipsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();

type Mastery = MasteriesQuery["masteries"][number];

const { result, loading, error } = useQuery(MasteriesDocument);
const masteries = computed<Mastery[]>(() => result.value?.masteries ?? []);
const search = ref("");
const headers = [
  { title: "Mastery Package", key: "masterypackage" },
  { title: "Ship Type", key: "shiptype" },
];

function onRowClick(_event: Event, row: { item: Mastery }) {
  console.log(row.item);
  router.push(`/masteries/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Masteries</h1>

    <loading-panel v-if="loading" :message="'Masteries'" />

    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <div v-else>
      <v-text-field v-model="search" label="Search" />

      <v-data-table
        :items="masteries ?? []"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        @click:row="onRowClick"
      >
      </v-data-table>
    </div>
  </v-container>
</template>
