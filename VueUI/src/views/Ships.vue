<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { ShipsDocument } from "@/graphql/generated/graphql";
import type { ShipsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import ShipBinderCard from "@/components/ships/ShipBinderCard.vue";
import ShipsListFiltersBar from "@/components/ships/ShipsListFiltersBar.vue";
import {
  BINDER_SIDE_SIZE,
  clampBinderPage,
  createDefaultShipsListState,
  filterShips,
  getBinderPage,
  parseShipsListQuery,
  readStoredShipsListState,
  serializeShipsListQuery,
  shipsListQueryIsEmpty,
  writeStoredShipsListState,
  type ShipsListFilters,
  type ShipsListState,
} from "@/logic/shipsBinder";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";
import CompareLaunch from "@/components/compare/CompareLaunch.vue";
import { useCollectionStore } from "@/stores/collection";

defineOptions({ name: "Ships" });

useKeepAliveScrollRestore();

const router = useRouter();
const route = useRoute();
const collectionStore = useCollectionStore();

type Ship = ShipsQuery["ships"][number];

const { result, loading, error } = useQuery(ShipsDocument);
const ships = computed<Ship[]>(() => result.value?.ships ?? []);

const hydratedState: ShipsListState = !shipsListQueryIsEmpty(route.query)
  ? parseShipsListQuery(route.query)
  : (readStoredShipsListState() ?? createDefaultShipsListState());

const search = ref(hydratedState.search);
const selectedTypes = ref<string[]>([...hydratedState.types]);
const selectedFactions = ref<string[]>([...hydratedState.factions]);
const selectedTiers = ref<number[]>([...hydratedState.tiers]);
const selectedCosts = ref<string[]>([...hydratedState.costs]);
const hideCollected = ref(hydratedState.hideCollected === true);
const hideFleet = ref(hydratedState.hideFleet === true);
const page = ref(hydratedState.page);
const syncingFromRoute = ref(false);

const shipFilters = computed<ShipsListFilters>({
  get: () => ({
    search: search.value,
    types: selectedTypes.value,
    factions: selectedFactions.value,
    tiers: selectedTiers.value,
    costs: selectedCosts.value,
    hideCollected: hideCollected.value,
    hideFleet: hideFleet.value,
  }),
  set: (next) => {
    search.value = next.search;
    selectedTypes.value = [...next.types];
    selectedFactions.value = [...next.factions];
    selectedTiers.value = [...next.tiers];
    selectedCosts.value = [...(next.costs ?? [])];
    hideCollected.value = Boolean(next.hideCollected);
    hideFleet.value = Boolean(next.hideFleet);
    page.value = 1;
  },
});

const collectedShipIds = computed(() => collectionStore.ownedCatalogIds("ship"));

const filteredShips = computed(() =>
  filterShips(ships.value, shipFilters.value, collectedShipIds.value),
);

const binder = computed(() => getBinderPage(filteredShips.value, page.value));

const listState = computed<ShipsListState>(() => ({
  ...shipFilters.value,
  page: binder.value.page,
}));

watch(
  () => binder.value.page,
  (safePage) => {
    if (page.value !== safePage) {
      page.value = safePage;
    }
  },
);

watch(
  listState,
  (state) => {
    writeStoredShipsListState(state);

    if (syncingFromRoute.value) return;

    const nextQuery = serializeShipsListQuery(state);
    const current = serializeShipsListQuery(parseShipsListQuery(route.query));
    if (JSON.stringify(nextQuery) === JSON.stringify(current)) return;

    router.replace({ query: nextQuery });
  },
  { deep: true, immediate: true },
);

watch(
  () => route.query,
  (query) => {
    if (shipsListQueryIsEmpty(query) && route.path === "/ships") {
      return;
    }

    const parsed = parseShipsListQuery(query);
    syncingFromRoute.value = true;
    search.value = parsed.search;
    selectedTypes.value = [...parsed.types];
    selectedFactions.value = [...parsed.factions];
    selectedTiers.value = [...parsed.tiers];
    selectedCosts.value = [...parsed.costs];
    hideCollected.value = parsed.hideCollected === true;
    hideFleet.value = parsed.hideFleet === true;
    page.value = parsed.page;
    queueMicrotask(() => {
      syncingFromRoute.value = false;
    });
  },
);

watch(filteredShips, (items) => {
  page.value = clampBinderPage(page.value, items.length);
});

function goToShip(shipId: number) {
  writeStoredShipsListState(listState.value);
  router.push(`/ships/${shipId}`);
}

function previousPage() {
  page.value = Math.max(1, page.value - 1);
}

function nextPage() {
  page.value = Math.min(binder.value.totalPages, page.value + 1);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container class="ships-page" fluid>
    <loading-panel v-if="loading" :message="'Ships'" />

    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <div v-else>
      <header class="registry-header">
        <div class="registry-header__eyebrow">
          STO-AEGIS Array // Vessel Database
        </div>
        <div class="registry-header__row">
          <h1 class="registry-header__title">Ship Registry</h1>
          <div class="registry-header__counts">
            <div>{{ ships.length }} vessels catalogued</div>
            <div>{{ filteredShips.length }} results displayed</div>
            <CompareLaunch />
          </div>
        </div>
      </header>

      <ShipsListFiltersBar v-model="shipFilters" :ships="ships">
      <div v-if="filteredShips.length === 0" class="empty-state">
        No ships match the current search and filters.
      </div>

      <div v-else class="binder">
        <div class="binder__page">
          <div class="binder__side">
            <ShipBinderCard
              v-for="ship in binder.left"
              :key="ship.id"
              :ship="ship"
              @select="goToShip"
            />
            <div
              v-for="index in Math.max(0, BINDER_SIDE_SIZE - binder.left.length)"
              :key="`left-empty-${index}`"
              class="binder__slot"
            />
          </div>

          <div class="binder__divider" aria-hidden="true">
            <div class="binder__spine" />
          </div>

          <div class="binder__side">
            <ShipBinderCard
              v-for="ship in binder.right"
              :key="ship.id"
              :ship="ship"
              @select="goToShip"
            />
            <div
              v-for="index in Math.max(0, BINDER_SIDE_SIZE - binder.right.length)"
              :key="`right-empty-${index}`"
              class="binder__slot"
            />
          </div>
        </div>

        <div class="binder__footer">
          <v-btn
            variant="outlined"
            :disabled="binder.page <= 1"
            prepend-icon="mdi-chevron-left"
            @click="previousPage"
          >
            Previous
          </v-btn>

          <div class="binder__page-label">
            Page {{ binder.page }} / {{ binder.totalPages }}
          </div>

          <v-btn
            variant="outlined"
            :disabled="binder.page >= binder.totalPages"
            append-icon="mdi-chevron-right"
            @click="nextPage"
          >
            Next
          </v-btn>
        </div>
      </div>
      </ShipsListFiltersBar>
    </div>
  </v-container>
</template>

<style scoped>
.ships-page {
  max-width: 1480px;
}

.registry-header {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
  background-image:
    linear-gradient(rgba(125, 211, 252, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 211, 252, 0.03) 1px, transparent 1px);
  background-size: 28px 28px;
}

.registry-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.registry-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.registry-header__title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.registry-header__title::before {
  content: "";
  width: 6px;
  height: 1.1em;
  border-radius: 2px;
  background: linear-gradient(180deg, #7dd3fc, #a78bfa);
}

.registry-header__counts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  text-align: right;
  color: #7dd3fc;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.45;
}

.empty-state {
  padding: 48px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 16px;
}

.binder {
  border-radius: 22px;
  padding: 18px;
  background:
    radial-gradient(circle at top, rgba(63, 167, 255, 0.08), transparent 45%),
    linear-gradient(180deg, #142032, #0c1522 70%, #09101a);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.binder__page {
  display: grid;
  grid-template-columns: 1fr 28px 1fr;
  gap: 12px;
  align-items: stretch;
}

.binder__side {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(220px, auto));
  gap: 12px;
  padding: 10px;
  border-radius: 16px;
  background: rgba(8, 14, 24, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.binder__slot {
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.015);
}

.binder__divider {
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 8px 0;
}

.binder__spine {
  width: 10px;
  border-radius: 999px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.18),
      rgba(255, 255, 255, 0.04) 20%,
      rgba(0, 0, 0, 0.35) 50%,
      rgba(255, 255, 255, 0.08) 80%,
      rgba(255, 255, 255, 0.16)
    ),
    linear-gradient(90deg, #2a1a12, #6b4630 40%, #2a1a12);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.45),
    4px 0 16px rgba(0, 0, 0, 0.35),
    -4px 0 16px rgba(0, 0, 0, 0.35);
}

.binder__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.binder__page-label {
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

@media (max-width: 1100px) {
  .binder__page {
    grid-template-columns: 1fr;
  }

  .binder__divider {
    height: 28px;
    padding: 0;
  }

  .binder__spine {
    width: 100%;
    height: 10px;
  }
}

@media (max-width: 700px) {
  .binder__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .binder__footer {
    flex-direction: column;
  }

  .registry-header__counts {
    text-align: left;
  }
}
</style>
