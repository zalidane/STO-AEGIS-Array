<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
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
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
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
import { bucketSearchHits, resolveSearchTab } from "@/logic/searchResults";
import type { CatalogKind } from "@/logic/collection/types";
import { useAlignItemCatalog } from "@/composables/useAlignItemCatalog";

const route = useRoute();
const router = useRouter();
const store = useCollectionStore();
const { activeCharacter } = storeToRefs(store);

const searchText = computed(() => String(route.query.q ?? ""));
const draftQuery = ref(searchText.value);

watch(searchText, (value) => {
  draftQuery.value = value;
});

const { result, loading, error } = useQuery(SearchDocument, () => ({
  text: searchText.value.trim(),
}));

const { result: shipsResult } = useQuery(ShipsDocument);
const { result: starshipResult } = useQuery(StarshipTraitsDocument);
const { result: itemsResult } = useQuery(InfoboxesDocument);
useAlignItemCatalog(() => itemsResult.value?.infoboxes);

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
  const hits = searchText.value.trim() ? (result.value?.search ?? []) : [];
  return bucketSearchHits(hits).map((bucket) => {
    const type = bucket.type as SearchType;
    const kind = catalogKindFromSearchType(type);
    const owned = new Set<number>();
    if (kind) {
      for (const hit of bucket.hits) {
        if (store.isOwnedByActive(kind, hit.id)) owned.add(hit.id);
      }
    }
    const { missingIds, collectedIds } = splitHitsByOwnership(
      bucket.hits,
      owned,
    );
    return {
      type,
      label: friendlyNames[type] ?? type,
      icon: typeIcons[type as keyof typeof typeIcons] ?? "mdi-help-circle",
      kind,
      hits: bucket.hits,
      missingIds,
      collectedIds,
    };
  });
});

const requestedTab = computed(() =>
  typeof route.query.tab === "string" ? route.query.tab : "",
);

const activeTab = computed({
  get: () =>
    resolveSearchTab(
      groupedResults.value.map((group) => group.type),
      requestedTab.value,
    ) ?? undefined,
  set: (type: string | undefined) => {
    if (!type || type === requestedTab.value) return;
    router.replace({
      query: { ...route.query, tab: type },
    });
  },
});

const activeGroup = computed(
  () =>
    groupedResults.value.find((group) => group.type === activeTab.value) ??
    groupedResults.value[0] ??
    null,
);

watch([groupedResults, loading], ([groups, isLoading]) => {
  if (isLoading) return;
  const current = requestedTab.value;
  if (!current) return;
  if (groups.some((group) => group.type === current)) return;
  const next = groups[0]?.type;
  const query = { ...route.query };
  if (next) query.tab = next;
  else delete query.tab;
  void router.replace({ query });
});

const hasCollectibleResults = computed(() =>
  groupedResults.value.some((group) => group.kind != null),
);

const showEmptyQuery = computed(() => !searchText.value.trim());
const showNoHits = computed(
  () =>
    !loading.value &&
    !error.value &&
    !showEmptyQuery.value &&
    groupedResults.value.length === 0,
);

function submitSearch() {
  const q = draftQuery.value.trim();
  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (requestedTab.value) query.tab = requestedTab.value;
  const sameQuery = q === searchText.value.trim();
  if (sameQuery) {
    void router.replace({ path: "/search", query });
    return;
  }
  void router.push({ path: "/search", query });
}

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
  <app-breadcrumbs />
  <v-container class="search-page">
    <header class="search-header">
      <h1 class="search-header__title">Search</h1>
      <form class="registry-search" @submit.prevent="submitSearch">
        <button
          type="submit"
          class="registry-search__submit"
          aria-label="Search"
        >
          <v-icon size="18" icon="mdi-magnify" />
        </button>
        <input
          v-model="draftQuery"
          type="search"
          placeholder="Search STO-AEGIS..."
          @keydown.enter.prevent="submitSearch"
        />
      </form>
    </header>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-else-if="error" type="error" class="mb-4">
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

    <p v-if="showEmptyQuery" class="search-empty">
      Enter a search to see ships, items, traits, and more.
    </p>
    <p v-else-if="showNoHits" class="search-empty">
      No results for <strong>{{ searchText }}</strong>.
    </p>

    <template v-else-if="groupedResults.length">
      <v-tabs
        v-model="activeTab"
        color="primary"
        bg-color="transparent"
        show-arrows
        class="search-tabs"
      >
        <v-tab
          v-for="group in groupedResults"
          :key="group.type"
          :value="group.type"
        >
          <v-icon start :icon="group.icon" />
          {{ group.label }}
          <span class="search-tabs__count">{{ group.hits.length }}</span>
        </v-tab>
      </v-tabs>

      <v-card v-if="activeGroup" class="search-panel">
        <v-card-title class="d-flex align-center flex-wrap ga-2">
          <v-icon :icon="activeGroup.icon" />
          <span>{{ activeGroup.label }}</span>
          <span class="search-panel__count">{{ activeGroup.hits.length }}</span>
          <v-spacer />
          <template v-if="activeGroup.kind">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              :disabled="!activeCharacter || activeGroup.missingIds.length === 0"
              @click="addAll(activeGroup)"
            >
              Add All {{ activeGroup.label }}
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              :disabled="
                !activeCharacter || activeGroup.collectedIds.length === 0
              "
              @click="removeAll(activeGroup)"
            >
              Remove All {{ activeGroup.label }}
            </v-btn>
          </template>
        </v-card-title>

        <v-list>
          <v-list-item
            v-for="hit in activeGroup.hits"
            :key="`${activeGroup.type}-${hit.id}`"
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
            <template v-if="activeGroup.kind" #append>
              <CollectToggle
                compact
                :kind="activeGroup.kind"
                :catalog-id="hit.id"
                :bind="bindFor(activeGroup.kind, hit.id)"
                :allow-account-unlock="allowUnlockFor(activeGroup.kind, hit.id)"
                :bind-choice-prompt="
                  bindChoicePromptFor(activeGroup.kind, hit.id)
                "
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </template>
  </v-container>
</template>

<style scoped>
.search-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.search-header__title {
  margin: 0;
  font-size: 1.85rem;
  letter-spacing: 0.04em;
}

.registry-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: min(640px, 100%);
  padding: 10px 12px;
  border: 1px solid rgba(125, 211, 252, 0.45);
  color: #7dd3fc;
  background: rgba(8, 18, 30, 0.9);
}

.registry-search__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.registry-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e8f7ff;
  font-size: 0.86rem;
  letter-spacing: 0.06em;
}

.registry-search input::placeholder {
  color: rgba(125, 211, 252, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.search-tabs {
  margin-bottom: 0.75rem;
}

.search-tabs__count,
.search-panel__count {
  margin-left: 0.35rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85em;
}

.search-empty {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.search-hit-link {
  color: inherit;
  text-decoration: none;
}

.search-hit-link:hover {
  text-decoration: underline;
}
</style>
