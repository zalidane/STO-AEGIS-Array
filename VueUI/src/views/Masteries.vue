<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  MasteriesDocument,
  type MasteriesQuery,
} from "@/graphql/generated/graphql";
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
  { title: "Faction", key: "shipfaction" },
  { title: "Mastery Type", key: "masterytype" },
  { title: "Primary Trait", key: "trait" },
  { title: "Secondary Trait", key: "trait2" },
  { title: "Tertiary Trait", key: "trait3" },
  { title: "Account Trait", key: "acctrait" },
];

function onRowClick(_event: Event, row: { item: Mastery }) {
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
      <v-text-field v-model="search" label="Search" class="mb-4" />
      <v-data-table
        :items="masteries"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        @click:row="onRowClick"
      />
    </div>
  </v-container>
</template>
