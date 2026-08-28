<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  SearchDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  type SearchQuery,
} from "@/graphql/generated/graphql";
import { friendlyNames } from "@/mappers/tableFriendlyNames";
import { typeIcons } from "@/mappers/typeIcons";
import { getSearchResultRoute } from "@/mappers/searchResultRoutes";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import { useCollectionStore } from "@/stores/collection";
import {
  allowsAccountUnlockFromCatalog,
  bindChoicePromptFromCatalog,
  bindScopeFromCatalog,
  type CatalogBindSources,
} from "@/logic/collection/catalogBind";
import {
  catalogKindFromSearchType,
  splitHitsByOwnership,
} from "@/logic/collection/searchCatalog";
import type { CatalogKind } from "@/logic/collection/types";

const route = useRoute();
const store = useCollectionStore();
const { activeCharacter } = storeToRefs(store);

const searchText = computed(() => String(route.query.q ?? ""));

const { result, loading, error } = useQuery(SearchDocument, () => ({
  text: searchText.value,
}));

const { result: shipsResult } = useQuery(ShipsDocument);
const { result: starshipResult } = useQuery(StarshipTraitsDocument);
const { result: itemsResult } = useQuery(InfoboxesDocument);

const catalogSources = computed<CatalogBindSources>(() => ({
  ships: shipsResult.value?.ships ?? [],
  starshipTraits: starshipResult.value?.starshipTraits ?? [],
  items: itemsResult.value?.infoboxes ?? [],
}));

type SearchType = keyof typeof friendlyNames;
type SearchHit = SearchQuery["search"][number];

type SearchGroup = {
  type: SearchType;
  label: string;
  icon: string;
  kind: CatalogKind | null;
  hits: SearchHit[];
  missingIds: number[];
  collectedIds: number[];
};

const groupedResults = computed<SearchGroup[]>(() => {
  const groups: Partial<Record<SearchType, SearchHit[]>> = {};

  for (const hit of result.value?.search ?? []) {
    const type = hit.type as SearchType;
    if (!(type in friendlyNames)) continue;
    const bucket = groups[type] ?? [];
    if (!bucket.some((existing) => existing.id === hit.id)) {
      bucket.push(hit);
    }
    groups[type] = bucket;
  }

  return (Object.keys(groups) as SearchType[]).map((type) => {
    const hits = groups[type] ?? [];
    const kind = catalogKindFromSearchType(type);
    const owned = new Set<number>();
    if (kind) {
      for (const hit of hits) {
        if (store.isOwnedByActive(kind, hit.id)) owned.add(hit.id);
      }
    }
    const { missingIds, collectedIds } = splitHitsByOwnership(hits, owned);
    return {
      type,
      label: friendlyNames[type] ?? type,
      icon: typeIcons[type as keyof typeof typeIcons] ?? "mdi-help-circle",
      kind,
      hits,
      missingIds,
      collectedIds,
    };
  });
});

const hasCollectibleResults = computed(() =>
  groupedResults.value.some((group) => group.kind != null),
);

function bindFor(kind: CatalogKind, catalogId: number) {
  return bindScopeFromCatalog(catalogSources.value, kind, catalogId);
}

function allowUnlockFor(kind: CatalogKind, catalogId: number) {
  return allowsAccountUnlockFromCatalog(
    catalogSources.value,
    kind,
    catalogId,
  );
}

function bindChoicePromptFor(kind: CatalogKind, catalogId: number) {
  return bindChoicePromptFromCatalog(
    catalogSources.value,
    kind,
    catalogId,
  );
}

function addAll(group: SearchGroup) {
  if (!group.kind || !activeCharacter.value) return;
  const kind = group.kind;
  store.collectMany(
    group.missingIds.map((catalogId) => ({
      kind,
      catalogId,
      bind: bindFor(kind, catalogId),
    })),
  );
}

function removeAll(group: SearchGroup) {
  if (!group.kind || !activeCharacter.value) return;
  const kind = group.kind;
  store.uncollectMany(
    group.collectedIds.map((catalogId) => ({ kind, catalogId })),
  );
}
</script>

<template>
  <v-container>
    <h1>Search Results</h1>

    <p>
      Results for:
      <strong>{{ searchText }}</strong>
    </p>

    <v-progress-linear v-if="loading" indeterminate />

    <v-alert v-else-if="error" type="error">
      {{ error.message }}
    </v-alert>

    <v-alert
      v-else-if="!activeCharacter && hasCollectibleResults"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Select a captain in the header to add search results to a collection.
    </v-alert>

    <v-card v-for="group in groupedResults" :key="group.type" class="mb-4">
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon>{{ group.icon }}</v-icon>
        <span>{{ group.label }} ({{ group.hits.length }})</span>
        <v-spacer />
        <template v-if="group.kind">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            :disabled="!activeCharacter || group.missingIds.length === 0"
            @click="addAll(group)"
          >
            Add All {{ group.label }}
          </v-btn>
          <v-btn
            size="small"
            variant="outlined"
            :disabled="!activeCharacter || group.collectedIds.length === 0"
            @click="removeAll(group)"
          >
            Remove All {{ group.label }}
          </v-btn>
        </template>
      </v-card-title>

      <v-list>
        <v-list-item
          v-for="hit in group.hits"
          :key="`${group.type}-${hit.id}`"
        >
          <v-list-item-title>
            <RouterLink
              v-if="getSearchResultRoute(hit.type, hit.id)"
              :to="getSearchResultRoute(hit.type, hit.id)!"
              class="search-hit-link"
            >
              {{ hit.name }}
            </RouterLink>
            <span v-else>{{ hit.name }}</span>
          </v-list-item-title>
          <template v-if="group.kind" #append>
            <CollectToggle
              compact
              :kind="group.kind"
              :catalog-id="hit.id"
              :bind="bindFor(group.kind, hit.id)"
              :allow-account-unlock="allowUnlockFor(group.kind, hit.id)"
              :bind-choice-prompt="bindChoicePromptFor(group.kind, hit.id)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<style scoped>
.search-hit-link {
  color: inherit;
  text-decoration: none;
}

.search-hit-link:hover {
  text-decoration: underline;
}
</style>
