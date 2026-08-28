<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import {
  InfoboxesDocument,
  ShipsDocument,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import TraitBrowserLayout from "@/components/traits/TraitBrowserLayout.vue";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";
import type { TraitBrowserItem } from "@/logic/traitBrowser";
import {
  filterEquipmentInfoboxes,
  mapEquipmentInfoboxToBrowserItem,
} from "@/logic/collection/itemBrowser";
import {
  allowsAccountUnlockFromCatalog,
  bindChoicePromptFromCatalog,
  bindScopeFromCatalog,
} from "@/logic/collection/catalogBind";
import type { BindScope } from "@/logic/collection/types";

defineOptions({ name: "Items" });

useKeepAliveScrollRestore();

const { result, loading, error } = useQuery(InfoboxesDocument);
const { result: shipsResult } = useQuery(ShipsDocument);

const equipment = computed(() =>
  filterEquipmentInfoboxes(result.value?.infoboxes ?? []),
);

const bindById = computed(() => {
  const map = new Map<number, BindScope>();
  const sources = {
    ships: shipsResult.value?.ships ?? [],
    starshipTraits: [],
    items: equipment.value,
  };
  for (const item of equipment.value) {
    map.set(item.id, bindScopeFromCatalog(sources, "item", item.id));
  }
  return map;
});

const items = computed<TraitBrowserItem[]>(() =>
  equipment.value.map(mapEquipmentInfoboxToBrowserItem),
);

function collectBindFor(item: TraitBrowserItem): BindScope {
  return bindById.value.get(item.id) ?? "unknown";
}

function collectAccountUnlockFor(item: TraitBrowserItem): boolean {
  return allowsAccountUnlockFromCatalog(
    {
      ships: shipsResult.value?.ships ?? [],
      starshipTraits: [],
      items: equipment.value,
    },
    "item",
    item.id,
  );
}

function collectBindChoicePromptFor(item: TraitBrowserItem): string {
  return bindChoicePromptFromCatalog(
    {
      ships: shipsResult.value?.ships ?? [],
      starshipTraits: [],
      items: equipment.value,
    },
    "item",
    item.id,
  );
}
</script>

<template>
  <app-breadcrumbs />
  <v-container fluid class="trait-page">
    <TraitBrowserLayout
      title="Items"
      source-label="Who"
      :items="items"
      :loading="loading"
      :error-message="error?.message"
      :details-path="(id) => `/items/${id}`"
      collect-kind="item"
      :collect-bind="collectBindFor"
      :collect-account-unlock="collectAccountUnlockFor"
      :collect-bind-choice-prompt="collectBindChoicePromptFor"
    />
  </v-container>
</template>

<style scoped>
.trait-page {
  max-width: 1400px;
}
</style>
