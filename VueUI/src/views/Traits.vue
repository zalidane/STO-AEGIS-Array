<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { TraitsDocument, type TraitsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import TraitBrowserLayout from "@/components/traits/TraitBrowserLayout.vue";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";
import {
  cleanTraitDescriptionText,
  firstNonEmpty,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";

defineOptions({ name: "Traits" });

useKeepAliveScrollRestore();

type Trait = TraitsQuery["traits"][number];

const { result, loading, error } = useQuery(TraitsDocument);

const items = computed<TraitBrowserItem[]>(() =>
  (result.value?.traits ?? []).map((trait: Trait) => ({
    id: trait.id,
    name: trait.name,
    listDescription: cleanTraitDescriptionText(
      firstNonEmpty(trait.description, trait.shortDescription),
    ),
    detailDescription: cleanTraitDescriptionText(
      firstNonEmpty(trait.description, trait.shortDescription),
    ),
    source: trait.source,
    type: trait.type,
    environment: trait.environment,
    career: trait.career,
  })),
);
</script>

<template>
  <app-breadcrumbs />
  <v-container fluid class="trait-page">
    <TraitBrowserLayout
      title="Traits"
      :items="items"
      :loading="loading"
      :error-message="error?.message"
      :details-path="(id) => `/traits/${id}`"
    />
  </v-container>
</template>

<style scoped>
.trait-page {
  max-width: 1400px;
}
</style>
