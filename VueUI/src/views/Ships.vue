<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { ShipsDocument } from "@/graphql/generated/graphql";
import type { ShipsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import ShipBinderCard from "@/components/ships/ShipBinderCard.vue";
import { getFactionColor } from "@/mappers/factionColors";
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
  toggleInclusiveValue,
  uniqueSortedStrings,
  uniqueSortedTiers,
  writeStoredShipsListState,
  type ShipsListState,
} from "@/logic/shipsBinder";

defineOptions({ name: "Ships" });

const router = useRouter();
const route = useRoute();

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
const page = ref(hydratedState.page);
const syncingFromRoute = ref(false);
/** Type filter drawer; closed by default. */
const openTypeDrawer = ref<string[]>([]);

function onSearchUpdate(value: string | null) {
  search.value = value ?? "";
  page.value = 1;
}

const availableTypes = computed(() =>
  uniqueSortedStrings(ships.value.map((ship) => ship.type)),
);

const availableFactions = computed(() =>
  uniqueSortedStrings(ships.value.map((ship) => ship.factionLede)),
);

const availableTiers = computed(() =>
  uniqueSortedTiers(ships.value.map((ship) => ship.tier)),
);

const currentFilters = computed(() => ({
  search: search.value,
  types: selectedTypes.value,
  factions: selectedFactions.value,
  tiers: selectedTiers.value,
}));

const filteredShips = computed(() =>
  filterShips(ships.value, currentFilters.value),
);

const binder = computed(() => getBinderPage(filteredShips.value, page.value));

const listState = computed<ShipsListState>(() => ({
  ...currentFilters.value,
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
    page.value = parsed.page;
    queueMicrotask(() => {
      syncingFromRoute.value = false;
    });
  },
);

watch(filteredShips, (items) => {
  page.value = clampBinderPage(page.value, items.length);
});

function factionButtonLabel(faction: string): string {
  if (/klingon/i.test(faction)) return "Klingon";
  if (/romulan/i.test(faction)) return "Romulan";
  if (/federation/i.test(faction)) return "Federation";
  if (/dominion/i.test(faction)) return "Dominion";
  if (/cross/i.test(faction)) return "Cross-Faction";
  return faction;
}

function factionAccent(faction: string): string {
  const color = getFactionColor(faction);
  if (color === "federation") return "#3fa7ff";
  if (color === "klingon") return "#d32f2f";
  if (color === "romulan") return "#00c853";
  if (color === "dominion") return "#ff9838";
  return "#7dd3fc";
}

function toggleType(type: string) {
  selectedTypes.value = toggleInclusiveValue(selectedTypes.value, type);
  page.value = 1;
}

function toggleFaction(faction: string) {
  selectedFactions.value = toggleInclusiveValue(selectedFactions.value, faction);
  page.value = 1;
}

function toggleTier(tier: number) {
  selectedTiers.value = toggleInclusiveValue(selectedTiers.value, tier);
  page.value = 1;
}

function clearFactionFilters() {
  selectedFactions.value = [];
  page.value = 1;
}

function clearTierFilters() {
  selectedTiers.value = [];
  page.value = 1;
}

function clearFilters() {
  search.value = "";
  selectedTypes.value = [];
  selectedFactions.value = [];
  selectedTiers.value = [];
  page.value = 1;
}

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

const hasActiveFilters = computed(
  () =>
    search.value.trim().length > 0 ||
    selectedTypes.value.length > 0 ||
    selectedFactions.value.length > 0 ||
    selectedTiers.value.length > 0,
);
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
          </div>
        </div>
      </header>

      <section class="registry-filters" aria-label="Ship filters">
        <div class="registry-filters__label">Filter by:</div>

        <label class="registry-search">
          <v-icon size="18" icon="mdi-magnify" />
          <input
            :value="search"
            type="search"
            placeholder="Search vessels..."
            @input="onSearchUpdate(($event.target as HTMLInputElement).value)"
          />
        </label>

        <div class="registry-group" role="group" aria-label="Faction">
          <button
            type="button"
            class="registry-chip registry-chip--all"
            :class="{ 'registry-chip--active': selectedFactions.length === 0 }"
            @click="clearFactionFilters"
          >
            All
          </button>
          <button
            v-for="faction in availableFactions"
            :key="faction"
            type="button"
            class="registry-chip"
            :class="{
              'registry-chip--active': selectedFactions.includes(faction),
            }"
            :style="{ '--chip-accent': factionAccent(faction) }"
            @click="toggleFaction(faction)"
          >
            {{ factionButtonLabel(faction) }}
          </button>
        </div>

        <div class="registry-group" role="group" aria-label="Tier">
          <button
            type="button"
            class="registry-chip registry-chip--all"
            :class="{ 'registry-chip--active': selectedTiers.length === 0 }"
            @click="clearTierFilters"
          >
            All
          </button>
          <button
            v-for="tier in availableTiers"
            :key="tier"
            type="button"
            class="registry-chip"
            :class="{ 'registry-chip--active': selectedTiers.includes(tier) }"
            @click="toggleTier(tier)"
          >
            Tier {{ tier }}
          </button>
        </div>
      </section>

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

      <section class="type-panel mt-4">
        <div class="d-flex align-center justify-space-between ga-2 mb-2">
          <div class="type-panel__heading">Ship type</div>
          <v-btn
            v-if="hasActiveFilters"
            size="small"
            variant="text"
            prepend-icon="mdi-filter-off"
            @click="clearFilters"
          >
            Clear filters
          </v-btn>
        </div>

        <v-expansion-panels
          v-model="openTypeDrawer"
          multiple
          variant="accordion"
          class="filter-drawers"
        >
          <v-expansion-panel value="type">
            <v-expansion-panel-title>
              <div class="filter-drawer-title">
                <span>Type</span>
                <v-chip
                  v-if="selectedTypes.length"
                  size="x-small"
                  color="secondary"
                  variant="tonal"
                >
                  {{ selectedTypes.length }}
                </v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="filter-buttons">
                <v-btn
                  v-for="type in availableTypes"
                  :key="type"
                  size="small"
                  rounded="lg"
                  :variant="selectedTypes.includes(type) ? 'flat' : 'outlined'"
                  :color="selectedTypes.includes(type) ? 'secondary' : undefined"
                  @click="toggleType(type)"
                >
                  {{ type }}
                </v-btn>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </section>
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
  text-align: right;
  color: #7dd3fc;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.45;
}

.registry-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  background: rgba(6, 14, 24, 0.72);
}

.registry-filters__label {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}

.registry-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: min(240px, 100%);
  padding: 8px 10px;
  border: 1px solid rgba(125, 211, 252, 0.45);
  color: #7dd3fc;
  background: rgba(8, 18, 30, 0.9);
}

.registry-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e8f7ff;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.registry-search input::placeholder {
  color: rgba(125, 211, 252, 0.55);
  text-transform: uppercase;
}

.registry-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.registry-chip {
  appearance: none;
  border: 1px solid var(--chip-accent, rgba(125, 211, 252, 0.55));
  background: transparent;
  color: var(--chip-accent, #7dd3fc);
  padding: 7px 10px;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  line-height: 1;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.registry-chip--all {
  --chip-accent: #7dd3fc;
}

.registry-chip:hover {
  background: color-mix(in srgb, var(--chip-accent, #7dd3fc) 16%, transparent);
}

.registry-chip--active {
  background: var(--chip-accent, #7dd3fc);
  color: #041018;
  border-color: var(--chip-accent, #7dd3fc);
}

.type-panel {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(18, 32, 55, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.type-panel__heading {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.55);
}

.filter-drawers :deep(.v-expansion-panel) {
  background: transparent;
}

.filter-drawers :deep(.v-expansion-panel-title) {
  min-height: 44px;
  padding-inline: 8px;
  font-size: 0.95rem;
}

.filter-drawers :deep(.v-expansion-panel-text__wrapper) {
  padding-inline: 8px 8px 12px;
}

.filter-drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
