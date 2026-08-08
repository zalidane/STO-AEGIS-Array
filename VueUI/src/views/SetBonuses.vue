<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  SetBonusesDocument,
  type SetBonusesQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();
type SetBonus = SetBonusesQuery["setBonuses"][number];

const { result, loading, error } = useQuery(SetBonusesDocument);
const items = computed<SetBonus[]>(() => result.value?.setBonuses ?? []);
const search = ref("");
const headers = [
  { title: "Name", key: "name" },
  { title: "Set Page", key: "setPage" },
  { title: "Req Items", key: "reqItems" },
  { title: "Passives", key: "passives" },
  { title: "Abilities", key: "abilities" },
];

function onRowClick(_event: Event, row: { item: SetBonus }) {
  router.push(`/set-bonuses/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Set Bonuses</h1>
    <loading-panel v-if="loading" :message="'Set Bonuses'" />
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
