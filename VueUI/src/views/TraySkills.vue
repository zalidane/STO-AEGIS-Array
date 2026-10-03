<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import {
  TraySkillsDocument,
  type TraySkillsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import TraitBrowserLayout from "@/components/traits/TraitBrowserLayout.vue";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";
import {
  mapTraySkillToBrowserItem,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";

defineOptions({ name: "TraySkills" });

useKeepAliveScrollRestore();

type TraySkill = TraySkillsQuery["traySkills"][number];

const { result, loading, error } = useQuery(TraySkillsDocument);

const items = computed<TraitBrowserItem[]>(() =>
  (result.value?.traySkills ?? []).map((skill: TraySkill) =>
    mapTraySkillToBrowserItem(skill),
  ),
);
</script>

<template>
  <app-breadcrumbs />
  <v-container fluid class="trait-page">
    <TraitBrowserLayout
      title="Tray Skills"
      source-label="Description"
      description-label="Summary"
      tab-facets="type-and-region"
      empty-noun="skills"
      :items="items"
      :loading="loading"
      :error-message="error?.message"
      :details-path="(id) => `/tray-skills/${id}`"
    />
  </v-container>
</template>

<style scoped>
.trait-page {
  max-width: 1400px;
}
</style>
