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
  cleanTraitDescriptionText,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";

defineOptions({ name: "TraySkills" });

useKeepAliveScrollRestore();

type TraySkill = TraySkillsQuery["traySkills"][number];

const { result, loading, error } = useQuery(TraySkillsDocument);

function formatRecharge(skill: TraySkill): string | null {
  const parts: string[] = [];
  if (skill.rechargeBase != null) parts.push(`Base ${skill.rechargeBase}s`);
  if (skill.rechargeGlobal != null) {
    parts.push(`Global ${skill.rechargeGlobal}s`);
  }
  return parts.length ? parts.join(" · ") : null;
}

const items = computed<TraitBrowserItem[]>(() =>
  (result.value?.traySkills ?? []).map((skill: TraySkill) => {
    const summary = cleanTraitDescriptionText(skill.description);

    return {
      id: skill.id,
      name: skill.name,
      listDescription: summary,
      detailDescription: summary,
      source: skill.descriptionLong?.trim() || null,
      type: skill.type,
      environment: skill.region,
      career: skill.system,
      meta: [
        { label: "Type", value: skill.type ?? "" },
        { label: "Region", value: skill.region ?? "" },
        { label: "System", value: skill.system ?? "" },
        { label: "Targets", value: skill.targets ?? "" },
        { label: "Affects", value: skill.affects ?? "" },
        { label: "Activation", value: skill.activation ?? "" },
        { label: "Recharge", value: formatRecharge(skill) ?? "" },
      ],
    };
  }),
);
</script>

<template>
  <app-breadcrumbs />
  <v-container fluid class="trait-page">
    <TraitBrowserLayout
      title="Tray Skills"
      source-label="Description"
      description-label="Summary"
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
