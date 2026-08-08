<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  TraySkillDocument,
  type TraySkillQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(TraySkillDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<TraySkillQuery["traySkill"]>;
const skill = computed<Detail | null>(() => result.value?.traySkill ?? null);

const fields = computed(() => {
  if (!skill.value) return [];
  const s = skill.value;
  return [
    { label: "System", value: s.system },
    { label: "Type", value: s.type },
    { label: "Region", value: s.region },
    { label: "Description", value: s.description },
    { label: "Description Long", value: s.descriptionLong },
    { label: "Targets", value: s.targets },
    { label: "Affects", value: s.affects },
    { label: "Activation", value: s.activation },
    { label: "Recharge Base", value: s.rechargeBase },
    { label: "Recharge Global", value: s.rechargeGlobal },
    { label: "Rank 1", value: s.rank1rank },
    { label: "Rank 1 Info", value: s.rank1info },
    { label: "Rank 2", value: s.rank2rank },
    { label: "Rank 2 Info", value: s.rank2info },
    { label: "Rank 3", value: s.rank3rank },
    { label: "Rank 3 Info", value: s.rank3info },
    { label: "Rank 4", value: s.rank4rank },
    { label: "Rank 4 Info", value: s.rank4info },
    { label: "Rank 5", value: s.rank5rank },
    { label: "Rank 5 Info", value: s.rank5info },
    { label: "Created", value: s.createdAt },
    { label: "Updated", value: s.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="skill?.name" />
    <loading-panel v-if="loading" :message="'Tray Skill Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="skill">
      <h3>{{ skill.name }}</h3>
      <h5>{{ skill.system }} • {{ skill.type }}</h5>
      <v-card class="mt-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
    </template>
    <v-alert v-else type="warning">Tray skill not found</v-alert>
  </v-container>
</template>
