<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  TraySkillsDocument,
  type TraySkillsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const router = useRouter();
type TraySkill = TraySkillsQuery["traySkills"][number];

const { result, loading, error } = useQuery(TraySkillsDocument);
const items = computed<TraySkill[]>(() => result.value?.traySkills ?? []);
const search = ref("");
const headers = [
  { title: "Name", key: "name" },
  { title: "System", key: "system" },
  { title: "Type", key: "type" },
  { title: "Region", key: "region" },
  { title: "Activation", key: "activation" },
  { title: "Recharge Base", key: "rechargeBase" },
  { title: "Recharge Global", key: "rechargeGlobal" },
];

function onRowClick(_event: Event, row: { item: TraySkill }) {
  router.push(`/tray-skills/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Tray Skills</h1>
    <loading-panel v-if="loading" :message="'Tray Skills'" />
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
