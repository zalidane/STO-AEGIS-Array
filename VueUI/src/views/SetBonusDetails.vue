<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  SetBonusDocument,
  type SetBonusQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(SetBonusDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<SetBonusQuery["setBonus"]>;
const item = computed<Detail | null>(() => result.value?.setBonus ?? null);

const fields = computed(() => {
  if (!item.value) return [];
  const s = item.value;
  return [
    { label: "Set Page", value: s.setPage },
    { label: "Required Items", value: s.reqItems },
    { label: "Passives", value: s.passives },
    { label: "Tray Skills", value: s.traySkills },
    { label: "Procs", value: s.procs },
    { label: "Abilities", value: s.abilities },
    { label: "Created", value: s.createdAt },
    { label: "Updated", value: s.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.name" />
    <loading-panel v-if="loading" :message="'Set Bonus Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <h3>{{ item.name }}</h3>
      <v-card class="mt-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
    </template>
    <v-alert v-else type="warning">Set bonus not found</v-alert>
  </v-container>
</template>
