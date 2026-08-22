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
  mapStarshipTraitToBrowserItem,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import {
  allowsAccountUnlockFromGrantingShips,
  bindScopeForKind,
} from "@/logic/collection/bind";
import type { BindScope } from "@/logic/collection/types";

defineOptions({ name: "StarshipTraits" });

useKeepAliveScrollRestore();

type StarshipTrait = StarshipTraitsQuery["starshipTraits"][number];

const { result, loading, error } = useQuery(StarshipTraitsDocument);

const items = computed<TraitBrowserItem[]>(() =>
  (result.value?.starshipTraits ?? []).map((trait: StarshipTrait) =>
    mapStarshipTraitToBrowserItem(trait),
  ),
);

function collectBindFor(item: TraitBrowserItem): BindScope {
  const trait = (result.value?.starshipTraits ?? []).find(
    (row) => row.id === item.id,
  );
  return bindScopeForKind({
    kind: "starshipTrait",
    grantingShipCosts: trait?.ships.map((ship) => ship.cost) ?? [],
  });
}

function collectAccountUnlockFor(item: TraitBrowserItem): boolean {
  const trait = (result.value?.starshipTraits ?? []).find(
    (row) => row.id === item.id,
  );
  return allowsAccountUnlockFromGrantingShips(
    trait?.ships.map((ship) => ship.cost) ?? [],
  );
}
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
      collect-kind="starshipTrait"
      :collect-bind="collectBindFor"
      :collect-account-unlock="collectAccountUnlockFor"
    />
  </v-container>
</template>

<style scoped>
.trait-page {
  max-width: 1400px;
}
</style>
