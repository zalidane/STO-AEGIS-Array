<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  advancedShipSearchFiltersAreActive,
  buildAcquisitionSelectItems,
  collectAcquisitionCodes,
  createDefaultAdvancedShipSearchFilters,
  FULL_SPEC_OPTIONS,
  loadAdvancedShipSearchFilterPrefs,
  saveAdvancedShipSearchFilterPrefs,
  uniqueSortedNumbers,
  type AdvancedShipSearchFilters,
  type AdvancedShipSearchRow,
  type FullSpecOption,
  type YesNoChoice,
} from "@/logic/advancedShipSearch";
import {
  toggleInclusiveValue,
  uniqueSortedStrings,
} from "@/logic/shipsBinder";
const filters = defineModel<AdvancedShipSearchFilters>({ required: true });

const props = defineProps<{
  rows: readonly AdvancedShipSearchRow[];
  sources: readonly {
    cost?: string | null;
    factionLede?: string | null;
  }[];
}>();

const filterPrefs = loadAdvancedShipSearchFilterPrefs();
const filtersExpanded = ref(filterPrefs.expanded);

watch(filtersExpanded, (expanded) => {
  saveAdvancedShipSearchFilterPrefs({ expanded });
});

const hasActive = computed(() =>
  advancedShipSearchFiltersAreActive(filters.value),
);

const foreOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.foreWeapons)),
);
const aftOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.aftWeapons)),
);
const totalWeaponOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.totalWeapons)),
);
const hangarOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.hangars)),
);
const engOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.consoles.engineering)),
);
const sciOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.consoles.science)),
);
const tacOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.consoles.tactical)),
);
const uniOptions = computed(() =>
  uniqueSortedNumbers(props.rows.map((row) => row.consoles.universal)),
);

const acquisitionSelectItems = computed(() =>
  buildAcquisitionSelectItems(collectAcquisitionCodes(props.sources)),
);

const factionOptions = computed(() =>
  uniqueSortedStrings(props.sources.map((ship) => ship.factionLede)),
);

const fullSpecChoices = computed(() => [
  ...FULL_SPEC_OPTIONS,
  "None" as const,
]);

function patch(next: Partial<AdvancedShipSearchFilters>) {
  filters.value = { ...filters.value, ...next };
}

function toggleNumber(
  key:
    | "foreWeapons"
    | "aftWeapons"
    | "totalWeapons"
    | "hangars"
    | "engConsoles"
    | "sciConsoles"
    | "tacConsoles"
    | "uniConsoles",
  value: number,
) {
  patch({ [key]: toggleInclusiveValue(filters.value[key], value) });
}

function toggleYesNo(
  key: "experimental" | "secondaryDeflector" | "dualCannons" | "fleetAvailable",
  value: YesNoChoice,
) {
  patch({ [key]: toggleInclusiveValue(filters.value[key], value) });
}

function toggleFullSpec(value: FullSpecOption | "None") {
  patch({ fullSpecs: toggleInclusiveValue(filters.value.fullSpecs, value) });
}

function onAcquisitionUpdate(value: unknown) {
  patch({
    acquisition: Array.isArray(value)
      ? value.filter((code): code is string => typeof code === "string")
      : [],
  });
}

function toggleFaction(faction: string) {
  patch({ factions: toggleInclusiveValue(filters.value.factions, faction) });
}

function clearFilters() {
  filters.value = createDefaultAdvancedShipSearchFilters();
}

function yesNoLabel(value: YesNoChoice): string {
  return value === "yes" ? "Yes" : "No";
}

function toggleFiltersExpanded() {
  filtersExpanded.value = !filtersExpanded.value;
}
</script>

<template>
  <section class="adv-filters" aria-label="Advanced ship filters">
    <div class="adv-filters__header">
      <button
        type="button"
        class="adv-filters__toggle"
        :aria-expanded="filtersExpanded"
        aria-controls="adv-filters-body"
        @click="toggleFiltersExpanded"
      >
        <v-icon
          size="18"
          :icon="filtersExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        />
        <span>{{ filtersExpanded ? "Hide filters" : "Show filters" }}</span>
        <v-chip
          v-if="hasActive && !filtersExpanded"
          size="x-small"
          color="secondary"
          variant="tonal"
        >
          Active
        </v-chip>
      </button>
      <v-btn
        v-if="hasActive"
        size="small"
        variant="text"
        prepend-icon="mdi-filter-off"
        @click="clearFilters"
      >
        Clear filters
      </v-btn>
    </div>

    <div v-show="filtersExpanded" id="adv-filters-body" class="adv-filters__body">
      <div class="adv-filters__toolbar">
        <label class="adv-search">
          <v-icon size="18" icon="mdi-magnify" />
          <input
            :value="filters.search"
            type="search"
            placeholder="Filter by ship name…"
            @input="
              patch({
                search: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </label>
      </div>

      <div class="adv-filters__grid">
        <fieldset class="adv-group adv-group--weapons">
          <legend>Weapon layout</legend>
          <div class="adv-group__stack">
          <div class="adv-group__row adv-group__row--first">
            <span class="adv-group__sub">Fore</span>
            <button
              v-for="n in foreOptions"
              :key="`fore-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.foreWeapons.includes(n) }"
              @click="toggleNumber('foreWeapons', n)"
            >
              {{ n }}
            </button>
          </div>
          <div class="adv-group__row">
            <span class="adv-group__sub">Aft</span>
            <button
              v-for="n in aftOptions"
              :key="`aft-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.aftWeapons.includes(n) }"
              @click="toggleNumber('aftWeapons', n)"
            >
              {{ n }}
            </button>
          </div>
          <div class="adv-group__row">
            <span class="adv-group__sub">Experimental</span>
            <button
              v-for="choice in ['yes', 'no'] as YesNoChoice[]"
              :key="`exp-${choice}`"
              type="button"
              class="adv-chip"
              :class="{
                'adv-chip--active': filters.experimental.includes(choice),
              }"
              @click="toggleYesNo('experimental', choice)"
            >
              {{ yesNoLabel(choice) }}
            </button>
          </div>
          <div class="adv-group__divider" role="separator" aria-hidden="true" />
          <div class="adv-group__row">
            <span class="adv-group__sub">Total</span>
            <button
              v-for="n in totalWeaponOptions"
              :key="`total-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.totalWeapons.includes(n) }"
              @click="toggleNumber('totalWeapons', n)"
            >
              {{ n }}
            </button>
          </div>
          </div>
        </fieldset>

        <fieldset class="adv-group adv-group--consoles">
          <legend>Console layout</legend>
          <div class="adv-group__stack">
          <div class="adv-group__row adv-group__row--first">
            <span class="adv-group__sub adv-group__sub--narrow">ENG</span>
            <button
              v-for="n in engOptions"
              :key="`eng-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.engConsoles.includes(n) }"
              @click="toggleNumber('engConsoles', n)"
            >
              {{ n }}
            </button>
          </div>
          <div class="adv-group__row">
            <span class="adv-group__sub adv-group__sub--narrow">SCI</span>
            <button
              v-for="n in sciOptions"
              :key="`sci-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.sciConsoles.includes(n) }"
              @click="toggleNumber('sciConsoles', n)"
            >
              {{ n }}
            </button>
          </div>
          <div class="adv-group__row">
            <span class="adv-group__sub adv-group__sub--narrow">TAC</span>
            <button
              v-for="n in tacOptions"
              :key="`tac-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.tacConsoles.includes(n) }"
              @click="toggleNumber('tacConsoles', n)"
            >
              {{ n }}
            </button>
          </div>
          <div class="adv-group__row">
            <span class="adv-group__sub adv-group__sub--narrow">UNI</span>
            <button
              v-for="n in uniOptions"
              :key="`uni-${n}`"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.uniConsoles.includes(n) }"
              @click="toggleNumber('uniConsoles', n)"
            >
              {{ n }}
            </button>
          </div>
          </div>
        </fieldset>

        <fieldset class="adv-group adv-group--fullspec">
          <legend>Full-spec seat</legend>
          <div class="adv-group__row adv-group__row--wrap adv-group__row--first">
            <button
              v-for="spec in fullSpecChoices"
              :key="spec"
              type="button"
              class="adv-chip"
              :class="{ 'adv-chip--active': filters.fullSpecs.includes(spec) }"
              @click="toggleFullSpec(spec)"
            >
              {{ spec }}
            </button>
          </div>
        </fieldset>

        <fieldset class="adv-group adv-group--meta">
          <legend>Hull options &amp; faction</legend>
          <div class="adv-meta">
            <div class="adv-meta__row">
              <div class="adv-meta__block">
                <span class="adv-meta__label">Secondary deflector</span>
                <div class="adv-group__row adv-group__row--tight">
                  <button
                    v-for="choice in ['yes', 'no'] as YesNoChoice[]"
                    :key="`sec-${choice}`"
                    type="button"
                    class="adv-chip"
                    :class="{
                      'adv-chip--active':
                        filters.secondaryDeflector.includes(choice),
                    }"
                    @click="toggleYesNo('secondaryDeflector', choice)"
                  >
                    {{ yesNoLabel(choice) }}
                  </button>
                </div>
              </div>
              <div class="adv-meta__block">
                <span class="adv-meta__label">Hangar bay</span>
                <div class="adv-group__row adv-group__row--tight">
                  <button
                    v-for="n in hangarOptions"
                    :key="`hang-${n}`"
                    type="button"
                    class="adv-chip"
                    :class="{ 'adv-chip--active': filters.hangars.includes(n) }"
                    @click="toggleNumber('hangars', n)"
                  >
                    {{ n }}
                  </button>
                </div>
              </div>
              <div class="adv-meta__block">
                <span class="adv-meta__label">Dual cannons</span>
                <div class="adv-group__row adv-group__row--tight">
                  <button
                    v-for="choice in ['yes', 'no'] as YesNoChoice[]"
                    :key="`dc-${choice}`"
                    type="button"
                    class="adv-chip"
                    :class="{
                      'adv-chip--active': filters.dualCannons.includes(choice),
                    }"
                    @click="toggleYesNo('dualCannons', choice)"
                  >
                    {{ yesNoLabel(choice) }}
                  </button>
                </div>
              </div>
              <div class="adv-meta__block">
                <span class="adv-meta__label">Fleet version available</span>
                <div class="adv-group__row adv-group__row--tight">
                  <button
                    v-for="choice in ['yes', 'no'] as YesNoChoice[]"
                    :key="`fleet-${choice}`"
                    type="button"
                    class="adv-chip"
                    :class="{
                      'adv-chip--active':
                        filters.fleetAvailable.includes(choice),
                    }"
                    @click="toggleYesNo('fleetAvailable', choice)"
                  >
                    {{ yesNoLabel(choice) }}
                  </button>
                </div>
              </div>
            </div>
            <div class="adv-meta__block adv-meta__block--faction">
              <span class="adv-meta__label">Faction</span>
              <div class="adv-group__row adv-group__row--wrap adv-group__row--tight">
                <button
                  v-for="faction in factionOptions"
                  :key="faction"
                  type="button"
                  class="adv-chip"
                  :class="{
                    'adv-chip--active': filters.factions.includes(faction),
                  }"
                  @click="toggleFaction(faction)"
                >
                  {{ faction }}
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset class="adv-group adv-group--acquisition">
          <legend>Acquisition</legend>
          <v-select
            class="adv-acquisition-select"
            :model-value="filters.acquisition"
            :items="acquisitionSelectItems"
            label="Acquisition methods"
            placeholder="Any acquisition"
            multiple
            chips
            closable-chips
            clearable
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="onAcquisitionUpdate"
          />
        </fieldset>
      </div>
    </div>
  </section>
</template>

<style scoped>
.adv-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.adv-filters__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.adv-filters__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(8, 16, 28, 0.65);
  color: #7dd3fc;
  border-radius: 10px;
  padding: 6px 12px;
  font: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.adv-filters__toggle:hover {
  border-color: rgba(125, 211, 252, 0.6);
}

.adv-filters__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.adv-filters__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.adv-search {
  flex: 1 1 240px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: rgba(8, 16, 28, 0.65);
}

.adv-search input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e8f4ff;
  font: inherit;
}

.adv-filters__grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 10px;
}

/* Compact cards: shrink-wrap content; never grow into empty flex cells. */
.adv-group {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start; /* critical: avoid stretch widening fit-content fieldsets */
  box-sizing: border-box;
  margin: 0;
  padding: 4px 8px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 18, 30, 0.55);
  flex: 0 0 auto;
  align-self: flex-start;
  width: max-content;
  max-width: 100%;
  height: max-content;
  min-inline-size: 0;
}

.adv-group--weapons,
.adv-group--consoles,
.adv-group--fullspec,
.adv-group--meta,
.adv-group--acquisition {
  flex: 0 0 auto;
  width: max-content;
}

.adv-group--acquisition {
  min-width: min(100%, 14rem);
  max-width: min(100%, 20rem);
  /* Select should use the card's content width. */
  align-items: stretch;
}

.adv-group legend {
  padding: 0 4px;
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.adv-group__stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  width: fit-content;
}

.adv-group__row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  margin-top: 0;
  width: fit-content;
}

.adv-group__row--first {
  margin-top: 0;
}

.adv-group__row--tight {
  margin-top: 2px;
  flex-wrap: wrap;
}

.adv-group__row--wrap {
  align-items: flex-start;
  flex-wrap: wrap;
  max-width: 100%;
}

.adv-group__sub {
  flex: 0 0 auto;
  min-width: 5.75rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.adv-group__sub--narrow {
  min-width: 2.1rem;
  width: 2.1rem;
}

.adv-group__divider {
  margin: 1px 0;
  border-top: 1px solid rgba(125, 211, 252, 0.28);
  width: 100%;
  box-sizing: border-box;
}

.adv-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin-top: 0;
  width: max-content;
  max-width: 100%;
}

.adv-meta__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px 14px;
  width: max-content;
  max-width: 100%;
}

.adv-meta__block {
  min-width: 0;
  width: max-content;
}

.adv-meta__block--faction {
  width: max-content;
  max-width: 100%;
}

.adv-meta__label {
  display: block;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.adv-acquisition-select {
  margin-top: 2px;
  width: 16rem;
  max-width: 100%;
}

.adv-acquisition-select :deep(.v-field) {
  font-size: 0.82rem;
}

.adv-chip {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.8rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.adv-chip:hover {
  border-color: rgba(125, 211, 252, 0.45);
}

.adv-chip--active {
  background: rgba(125, 211, 252, 0.18);
  border-color: rgba(125, 211, 252, 0.7);
  color: #e8f7ff;
}
</style>
