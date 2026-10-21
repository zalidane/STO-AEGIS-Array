<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import { ShipsDocument, type ShipsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import CompareColumns from "@/components/compare/CompareColumns.vue";
import { useCompareStore } from "@/stores/compare";
import { buildMultiCompareSections } from "@/logic/compare/multi";
import { COMPARE_HULL_LIMIT, parseCompareQuery } from "@/logic/compare/selection";

const route = useRoute();
const router = useRouter();
const compare = useCompareStore();
const { ids, path } = storeToRefs(compare);

const { result, loading, error } = useQuery(ShipsDocument);

type Ship = ShipsQuery["ships"][number];

const ships = computed<Ship[]>(() => result.value?.ships ?? []);

const columns = computed(() =>
  ids.value
    .map((id) => ships.value.find((row) => row.id === id) ?? null)
    .filter((ship): ship is Ship => ship != null),
);

const missingIds = computed(() =>
  ids.value.filter((id) => !ships.value.some((row) => row.id === id)),
);

const sections = computed(() =>
  columns.value.length >= 2 ? buildMultiCompareSections(columns.value) : [],
);

const canReorder = computed(() => ids.value.length >= 2);

watch(
  () => route.query,
  (query) => {
    if (route.path !== "/ships/compare") return;
    const fromQuery = parseCompareQuery(query);
    if (fromQuery.length === 0) return;
    const current = ids.value.join(",");
    if (fromQuery.join(",") === current) return;
    compare.replace(fromQuery);
  },
  { immediate: true },
);

watch(path, (next) => {
  if (route.path !== "/ships/compare") return;
  if (route.fullPath === next) return;
  router.replace(next);
});

function reverseOrder() {
  if (!canReorder.value) return;
  compare.replace([...ids.value].reverse());
}
</script>

<template>
  <v-container class="compare-page" fluid>
    <AppBreadcrumbs />
    <loading-panel v-if="loading" message="Compare hulls" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>

    <template v-else>
      <header class="compare-header">
        <div>
          <div class="compare-header__eyebrow">STO-AEGIS Array // Drydock</div>
          <h1 class="compare-header__title">Compare hulls</h1>
          <p class="compare-header__lede">
            Up to {{ COMPARE_HULL_LIMIT }} vessels, same cards, same rows.
            Select hulls from the ship browser, collection, or a ship page.
          </p>
        </div>
        <div class="compare-header__actions">
          <v-btn
            variant="outlined"
            size="small"
            prepend-icon="mdi-swap-horizontal"
            :disabled="!canReorder"
            @click="reverseOrder"
          >
            {{ ids.length > 2 ? "Reverse order" : "Swap sides" }}
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            :disabled="ids.length === 0"
            @click="compare.clear()"
          >
            Clear
          </v-btn>
        </div>
      </header>

      <article v-if="columns.length === 0" class="hero-card hero-card--empty">
        <p>Select hulls to compare.</p>
        <v-btn to="/ships" size="small" variant="outlined">Ship browser</v-btn>
      </article>

      <CompareColumns
        :hulls="columns"
        :sections="sections"
        @remove="compare.remove"
      />

      <p v-if="columns.length === 1" class="compare-hint">
        Select another hull to compare.
      </p>
      <p v-for="id in missingIds" :key="id" class="missing">
        Hull #{{ id }} is not in the catalog.
      </p>
    </template>
  </v-container>
</template>

<style scoped>
.compare-page {
  max-width: 1440px;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(125, 211, 252, 0.45);
}

.compare-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.compare-header__title {
  margin: 0 0 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.compare-header__lede {
  margin: 0;
  max-width: 40rem;
  color: rgba(255, 255, 255, 0.68);
}

.compare-header__actions {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.hero-card--empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.65rem;
  max-width: 24rem;
  min-height: 5.5rem;
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 22, 36, 0.85);
  color: rgba(255, 255, 255, 0.65);
}

.compare-hint {
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.65);
}

.missing {
  color: rgba(255, 180, 120, 0.9);
}
</style>
