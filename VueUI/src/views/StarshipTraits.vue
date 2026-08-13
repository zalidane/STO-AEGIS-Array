<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import {
  StarshipTraitsDocument,
  type StarshipTraitsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import TraitBrowserLayout from "@/components/traits/TraitBrowserLayout.vue";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";
import {
  cleanTraitDescriptionText,
  firstNonEmpty,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";

defineOptions({ name: "StarshipTraits" });

useKeepAliveScrollRestore();

type StarshipTrait = StarshipTraitsQuery["starshipTraits"][number];

const { result, loading, error } = useQuery(StarshipTraitsDocument);

const items = computed<TraitBrowserItem[]>(() =>
  (result.value?.starshipTraits ?? []).map((trait: StarshipTrait) => ({
    id: trait.id,
    name: trait.name,
    listDescription: cleanTraitDescriptionText(
      firstNonEmpty(trait.short, trait.basic, trait.detailed),
    ),
    detailDescription: cleanTraitDescriptionText(
      firstNonEmpty(trait.detailed, trait.basic, trait.short),
    ),
    source: trait.obtained,
    type: trait.type,
    environment: null,
    career: null,
    ships: trait.ships,
  })),
);
</script>

<template>
  <app-breadcrumbs />
  <v-container fluid class="trait-page">
    <TraitBrowserLayout
      title="Starship Traits"
      source-label="Obtained"
      :items="items"
      :loading="loading"
      :error-message="error?.message"
      :details-path="(id) => `/starship-traits/${id}`"
    />
  </v-container>
</template>

<style scoped>
.trait-page {
  max-width: 1400px;
}
</style>
