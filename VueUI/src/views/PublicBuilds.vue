<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { PublicBuildsDocument } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import PublicBuildCard from "@/components/builds/PublicBuildCard.vue";
import {
  DEFAULT_PUBLIC_BUILDS_VIEW_STATE,
  PUBLIC_BUILDS_PAGE_SIZE,
  PUBLIC_BUILD_SORT_OPTIONS,
  clampPublicBuildsPage,
  parsePublicBuildsViewState,
  publicBuildsFiltersAreActive,
  publicBuildsOffset,
  publicBuildsPageCount,
  serializePublicBuildsViewState,
  type PublicBuildsViewState,
} from "@/logic/publicBuilds/queryState";

defineOptions({ name: "PublicBuilds" });

const route = useRoute();
const router = useRouter();

const filters = ref<PublicBuildsViewState>(
  parsePublicBuildsViewState(route.query),
);

const queryVariables = computed(() => ({
  search: filters.value.search.trim() || null,
  shipName: filters.value.shipName.trim() || null,
  faction: filters.value.faction.trim() || null,
  tier: filters.value.tier,
  sort: filters.value.sort,
  offset: publicBuildsOffset(filters.value.page),
  limit: PUBLIC_BUILDS_PAGE_SIZE,
}));

const { result, loading, error } = useQuery(
  PublicBuildsDocument,
  queryVariables,
);

const connection = computed(() => result.value?.publicBuilds ?? null);
const items = computed(() => connection.value?.items ?? []);
const totalCount = computed(() => connection.value?.totalCount ?? 0);
const facets = computed(
  () =>
    connection.value?.facets ?? {
      factions: [],
      tiers: [],
      shipNames: [],
    },
);

const pageCount = computed(() => publicBuildsPageCount(totalCount.value));

const sortItems = PUBLIC_BUILD_SORT_OPTIONS.map((option) => ({
  title: option.title,
  value: option.value,
}));

const shipSelectItems = computed(() =>
  facets.value.shipNames.map((name) => ({ title: name, value: name })),
);

watch(
  () => route.query,
  (query) => {
    filters.value = parsePublicBuildsViewState(query);
  },
);

watch(
  filters,
  (state) => {
    const next = serializePublicBuildsViewState(state);
    const current = serializePublicBuildsViewState(
      parsePublicBuildsViewState(route.query),
    );
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    void router.replace({ path: "/builds", query: next });
  },
  { deep: true },
);

watch(totalCount, (count) => {
  const clamped = clampPublicBuildsPage(filters.value.page, count);
  if (clamped !== filters.value.page) filters.value.page = clamped;
});

function patch(next: Partial<PublicBuildsViewState>) {
  const resetsPage = Object.keys(next).some((key) => key !== "page");
  filters.value = {
    ...filters.value,
    ...next,
    page: resetsPage && !("page" in next) ? 1 : (next.page ?? filters.value.page),
  };
}

function toggleFaction(faction: string) {
  patch({ faction: filters.value.faction === faction ? "" : faction });
}

function toggleTier(tier: number) {
  patch({ tier: filters.value.tier === tier ? null : tier });
}

function clearFilters() {
  filters.value = {
    ...DEFAULT_PUBLIC_BUILDS_VIEW_STATE,
    sort: filters.value.sort,
  };
}

function onSort(value: unknown) {
  const match = PUBLIC_BUILD_SORT_OPTIONS.find((option) => option.value === value);
  if (match) patch({ sort: match.value });
}
</script>

<template>
  <app-breadcrumbs />
  <v-container class="pub-page" fluid>
    <loading-panel v-if="loading && !connection" message="Published Builds" />
    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <template v-else>
      <header class="pub-header">
        <div class="pub-header__eyebrow">STO-AEGIS Array // Shared Boards</div>
        <div class="pub-header__row">
          <div>
            <h1 class="pub-header__title">Published Builds</h1>
            <p class="pub-header__lede">
              Publicly listed loadouts. Open a card to view the shared board.
            </p>
          </div>
          <div class="pub-header__counts">
            <div>{{ totalCount }} published</div>
            <div>
              {{ items.length }} on this page
            </div>
          </div>
        </div>
      </header>

      <section class="pub-filters" aria-label="Published build filters">
        <div class="pub-filters__toolbar">
          <label class="pub-search">
            <v-icon size="18" icon="mdi-magnify" />
            <input
              :value="filters.search"
              type="search"
              placeholder="Search by build or ship name…"
              @input="
                patch({
                  search: ($event.target as HTMLInputElement).value,
                })
              "
            />
          </label>
          <v-select
            :model-value="filters.sort"
            :items="sortItems"
            label="Sort"
            density="compact"
            variant="outlined"
            hide-details
            class="pub-sort"
            @update:model-value="onSort"
          />
          <v-select
            :model-value="filters.shipName || null"
            :items="shipSelectItems"
            label="Ship"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            class="pub-ship"
            @update:model-value="
              (value: unknown) =>
                patch({ shipName: typeof value === 'string' ? value : '' })
            "
          />
          <v-btn
            v-if="publicBuildsFiltersAreActive(filters)"
            size="small"
            variant="text"
            prepend-icon="mdi-filter-off"
            @click="clearFilters"
          >
            Clear filters
          </v-btn>
        </div>
        <div v-if="facets.factions.length" class="pub-filters__row">
          <span class="pub-filters__label">Faction</span>
          <button
            v-for="faction in facets.factions"
            :key="faction"
            type="button"
            class="pub-chip"
            :class="{ 'pub-chip--active': filters.faction === faction }"
            @click="toggleFaction(faction)"
          >
            {{ faction }}
          </button>
        </div>
        <div v-if="facets.tiers.length" class="pub-filters__row">
          <span class="pub-filters__label">Tier</span>
          <button
            v-for="tier in facets.tiers"
            :key="tier"
            type="button"
            class="pub-chip"
            :class="{ 'pub-chip--active': filters.tier === tier }"
            @click="toggleTier(tier)"
          >
            T{{ tier }}
          </button>
        </div>
      </section>

      <div v-if="items.length === 0" class="empty-featured">
        No published builds match the current search and filters.
      </div>
      <div v-else class="pub-grid">
        <PublicBuildCard
          v-for="item in items"
          :key="item.publicCode"
          :public-code="item.publicCode"
          :title="item.title"
          :ship-name="item.shipName"
          :fill-count="item.fillCount"
          :featured-count="item.featuredCount"
          :listed-at="item.listedAt"
          :created-at="item.createdAt"
          :ship="item.ship"
        />
      </div>

      <div v-if="pageCount > 1" class="pub-pager">
        <v-btn
          variant="outlined"
          :disabled="filters.page <= 1"
          prepend-icon="mdi-chevron-left"
          @click="patch({ page: filters.page - 1 })"
        >
          Previous
        </v-btn>
        <div class="pub-pager__label">
          Page {{ filters.page }} / {{ pageCount }}
        </div>
        <v-btn
          variant="outlined"
          :disabled="filters.page >= pageCount"
          append-icon="mdi-chevron-right"
          @click="patch({ page: filters.page + 1 })"
        >
          Next
        </v-btn>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.pub-page {
  max-width: 1200px;
  padding-bottom: 2.5rem;
}

.pub-header {
  margin-bottom: 1.25rem;
}

.pub-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.pub-header__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-end;
}

.pub-header__title {
  margin: 0.25rem 0 0.35rem;
  font-size: 2rem;
}

.pub-header__lede,
.pub-header__counts {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.pub-header__counts {
  text-align: right;
  font-size: 0.9rem;
}

.pub-filters {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-bottom: 1.25rem;
}

.pub-filters__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.pub-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1 1 16rem;
  min-width: 12rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(13, 22, 36, 0.85);
}

.pub-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
}

.pub-sort,
.pub-ship {
  width: 14rem;
  max-width: 100%;
}

.pub-filters__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.pub-filters__label {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-right: 0.25rem;
}

.pub-chip {
  border: 1px solid rgba(125, 211, 252, 0.3);
  background: transparent;
  color: inherit;
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.pub-chip--active,
.pub-chip:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(125, 211, 252, 0.12);
}

.pub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
  gap: 1rem;
}

.pub-pager {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.pub-pager__label {
  color: rgba(255, 255, 255, 0.7);
}

.empty-featured {
  padding: 2rem 1rem;
  color: rgba(255, 255, 255, 0.7);
}

@media (max-width: 700px) {
  .pub-header__title {
    font-size: 1.6rem;
  }

  .pub-header__counts {
    text-align: left;
  }

  .pub-grid {
    grid-template-columns: 1fr;
  }

  .pub-sort,
  .pub-ship {
    width: 100%;
  }
}
</style>
