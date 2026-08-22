<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  TraitByIdDocument,
  type TraitByIdQuery,
} from "@/graphql/documents/traitById";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";

const route = useRoute();
const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(TraitByIdDocument, () => ({
  id: id.value,
}));

type TraitDetail = NonNullable<TraitByIdQuery["traitById"]>;
const trait = computed<TraitDetail | null>(
  () => result.value?.traitById ?? null,
);

const fields = computed(() => {
  if (!trait.value) return [];
  const t = trait.value;
  return [
    { label: "Type", value: t.type },
    { label: "Environment", value: t.environment },
    { label: "Description", value: t.description },
    { label: "Career", value: t.career },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="trait?.name" />
    <loading-panel v-if="loading" :message="'Trait Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="trait">
      <div class="d-flex align-start justify-space-between ga-4 mb-4">
        <h3>{{ trait.name }}</h3>
        <CollectToggle kind="trait" :catalog-id="trait.id" bind="character" />
      </div>
      <v-card class="mt-4">
        <v-card-title>Trait Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
    </template>
    <v-alert v-else type="warning">Trait not found</v-alert>
  </v-container>
</template>
