<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import {
  InfoboxesDocument,
  ShipsDocument,
  type InfoboxesQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import TraitBrowserLayout from "@/components/traits/TraitBrowserLayout.vue";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";
import {
  cleanTraitDescriptionText,
  firstNonEmpty,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import { filterEquipmentInfoboxes } from "@/logic/collection/itemBrowser";
import {
  allowsAccountUnlockFromCatalog,
  bindScopeFromCatalog,
} from "@/logic/collection/catalogBind";
import type { BindScope } from "@/logic/collection/types";

defineOptions({ name: "Items" });

useKeepAliveScrollRestore();

type Infobox = InfoboxesQuery["infoboxes"][number];

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
  equipment.value.map((item: Infobox) => {
    const description = cleanTraitDescriptionText(
      firstNonEmpty(item.text1, item.type),
    );
    return {
      id: item.id,
      name: item.name,
      listDescription: description,
      detailDescription: description,
      source: item.who,
      type: item.type,
      environment: item.boundto,
      career: item.rarity,
      meta: [
        { label: "Type", value: item.type ?? "" },
        { label: "Rarity", value: item.rarity ?? "" },
        { label: "Bound", value: item.boundto ?? "" },
      ],
    };
  }),
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
    />
  </v-container>
</template>

<style scoped>
.trait-page {
  max-width: 1400px;
}
</style>
