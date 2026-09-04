<script setup lang="ts">
import { computed, ref } from "vue";
import { getFactionColor } from "@/mappers/factionColors";
import {
  shipsListFiltersAreActive,
  toggleInclusiveValue,
  uniqueSortedStrings,
  uniqueSortedTiers,
  type ShipListItem,
  type ShipsListFilters,
} from "@/logic/shipsBinder";
import { currencyDisplayLabel } from "@/utils/parsers/shipCost";

const filters = defineModel<ShipsListFilters>({ required: true });

const props = defineProps<{
  ships: readonly ShipListItem[];
}>();

const openTypeDrawer = ref<string[]>([]);

const availableTypes = computed(() =>
  uniqueSortedStrings(props.ships.map((ship) => ship.type)),
);

const availableFactions = computed(() =>
  uniqueSortedStrings(props.ships.map((ship) => ship.factionLede)),
);

const availableTiers = computed(() =>
  uniqueSortedTiers(props.ships.map((ship) => ship.tier)),
);

const tierSelectItems = computed(() =>
  availableTiers.value.map((tier) => ({
    title: `Tier ${tier}`,
    value: tier,
  })),
);

const hasActiveFilters = computed(() =>
  shipsListFiltersAreActive(filters.value),
);

function patch(next: Partial<ShipsListFilters>) {
  filters.value = { ...filters.value, ...next };
}

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

function onSearchUpdate(value: string) {
  patch({ search: value });
}

function toggleType(type: string) {
  patch({ types: toggleInclusiveValue(filters.value.types, type) });
}

function toggleFaction(faction: string) {
  patch({ factions: toggleInclusiveValue(filters.value.factions, faction) });
}

function onTiersUpdate(value: unknown) {
  patch({
    tiers: Array.isArray(value) ? uniqueSortedTiers(value.map(Number)) : [],
  });
}

function toggleHideCollected() {
  patch({ hideCollected: !filters.value.hideCollected });
}

function toggleHideFleet() {
  patch({ hideFleet: !filters.value.hideFleet });
}

function clearFactionFilters() {
  patch({ factions: [] });
}

function clearCostFilters() {
  patch({ costs: [] });
}

function removeCostFilter(code: string) {
  patch({
    costs: (filters.value.costs ?? []).filter((cost) => cost !== code),
  });
}

function clearFilters() {
  patch({
    search: "",
    types: [],
    factions: [],
    tiers: [],
    costs: [],
    hideCollected: false,
    hideFleet: false,
  });
}
</script>

<template>
  <div class="ships-filters">
    <section class="registry-filters" aria-label="Ship filters">
      <div class="registry-filters__label">Filter by:</div>

      <label class="registry-search">
        <v-icon size="18" icon="mdi-magnify" />
        <input
          :value="filters.search"
          type="search"
          placeholder="Search vessels..."
          @input="onSearchUpdate(($event.target as HTMLInputElement).value)"
        />
      </label>

      <div
        v-if="filters.costs?.length"
        class="registry-group"
        role="group"
        aria-label="Acquisition"
      >
        <button
          type="button"
          class="registry-chip registry-chip--all"
          @click="clearCostFilters"
        >
          All
        </button>
        <button
          v-for="code in filters.costs"
          :key="code"
          type="button"
          class="registry-chip registry-chip--active"
          @click="removeCostFilter(code)"
        >
          {{ currencyDisplayLabel(code) }}
        </button>
      </div>

      <div class="registry-group" role="group" aria-label="Faction">
        <button
          type="button"
          class="registry-chip registry-chip--all"
          :class="{ 'registry-chip--active': filters.factions.length === 0 }"
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
            'registry-chip--active': filters.factions.includes(faction),
          }"
          :style="{ '--chip-accent': factionAccent(faction) }"
          @click="toggleFaction(faction)"
        >
          {{ factionButtonLabel(faction) }}
        </button>
      </div>

      <div class="registry-group" role="group" aria-label="Visibility">
        <button
          type="button"
          class="registry-chip"
          :class="{ 'registry-chip--active': filters.hideCollected }"
          @click="toggleHideCollected"
        >
          Hide collected
        </button>
        <button
          type="button"
          class="registry-chip"
          :class="{ 'registry-chip--active': filters.hideFleet }"
          @click="toggleHideFleet"
        >
          Hide Fleet
        </button>
      </div>

      <v-select
        class="registry-tier-select"
        :model-value="filters.tiers"
        :items="tierSelectItems"
        label="Tier"
        placeholder="All tiers"
        multiple
        chips
        closable-chips
        clearable
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="onTiersUpdate"
      />
    </section>

    <slot />

    <section class="type-panel">
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
                v-if="filters.types.length"
                size="x-small"
                color="secondary"
                variant="tonal"
              >
                {{ filters.types.length }}
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
                :variant="filters.types.includes(type) ? 'flat' : 'outlined'"
                :color="filters.types.includes(type) ? 'secondary' : undefined"
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
</template>

<style scoped>
.ships-filters {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.registry-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
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

.registry-tier-select {
  min-width: 11.5rem;
  max-width: 16rem;
  flex: 1 1 11.5rem;
}

.registry-tier-select :deep(.v-field) {
  font-size: 0.78rem;
}

.registry-tier-select :deep(.v-label),
.registry-tier-select :deep(.v-field__input) {
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
</style>
