<script setup lang="ts">
import { computed } from "vue";
import {
  advancedShipSearchFiltersAreActive,
  createDefaultAdvancedShipSearchFilters,
  FULL_SPEC_OPTIONS,
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
import { currencyDisplayLabel, parseShipCost } from "@/utils/parsers/shipCost";

const filters = defineModel<AdvancedShipSearchFilters>({ required: true });

const props = defineProps<{
  rows: readonly AdvancedShipSearchRow[];
  sources: readonly {
    cost?: string | null;
    factionLede?: string | null;
  }[];
}>();

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

const acquisitionOptions = computed(() => {
  const codes = new Set<string>();
  for (const source of props.sources) {
    for (const part of parseShipCost(source.cost)) {
      if (part.currencyCode) codes.add(part.currencyCode);
    }
  }
  return [...codes].sort((a, b) =>
    currencyDisplayLabel(a).localeCompare(currencyDisplayLabel(b)),
  );
});

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

function toggleAcquisition(code: string) {
  patch({
    acquisition: toggleInclusiveValue(filters.value.acquisition, code),
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
</script>

<template>
  <section class="adv-filters" aria-label="Advanced ship filters">
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

    <div class="adv-filters__grid">
      <fieldset class="adv-group">
        <legend>Weapon layout</legend>
        <div class="adv-group__row">
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
      </fieldset>

      <fieldset class="adv-group">
        <legend>Full-spec seat</legend>
        <div class="adv-group__row adv-group__row--wrap">
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

      <fieldset class="adv-group">
        <legend>Secondary deflector</legend>
        <div class="adv-group__row">
          <button
            v-for="choice in ['yes', 'no'] as YesNoChoice[]"
            :key="`sec-${choice}`"
            type="button"
            class="adv-chip"
            :class="{
              'adv-chip--active': filters.secondaryDeflector.includes(choice),
            }"
            @click="toggleYesNo('secondaryDeflector', choice)"
          >
            {{ yesNoLabel(choice) }}
          </button>
        </div>
      </fieldset>

      <fieldset class="adv-group">
        <legend>Hangar bay</legend>
        <div class="adv-group__row">
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
      </fieldset>

      <fieldset class="adv-group adv-group--wide">
        <legend>Console layout</legend>
        <div class="adv-group__row">
          <span class="adv-group__sub">ENG</span>
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
          <span class="adv-group__sub">SCI</span>
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
          <span class="adv-group__sub">TAC</span>
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
          <span class="adv-group__sub">UNI</span>
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
      </fieldset>

      <fieldset class="adv-group">
        <legend>Dual cannons</legend>
        <div class="adv-group__row">
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
      </fieldset>

      <fieldset class="adv-group">
        <legend>Fleet version available</legend>
        <div class="adv-group__row">
          <button
            v-for="choice in ['yes', 'no'] as YesNoChoice[]"
            :key="`fleet-${choice}`"
            type="button"
            class="adv-chip"
            :class="{
              'adv-chip--active': filters.fleetAvailable.includes(choice),
            }"
            @click="toggleYesNo('fleetAvailable', choice)"
          >
            {{ yesNoLabel(choice) }}
          </button>
        </div>
      </fieldset>

      <fieldset class="adv-group adv-group--wide">
        <legend>Faction</legend>
        <div class="adv-group__row adv-group__row--wrap">
          <button
            v-for="faction in factionOptions"
            :key="faction"
            type="button"
            class="adv-chip"
            :class="{ 'adv-chip--active': filters.factions.includes(faction) }"
            @click="toggleFaction(faction)"
          >
            {{ faction }}
          </button>
        </div>
      </fieldset>

      <fieldset class="adv-group adv-group--wide">
        <legend>Acquisition</legend>
        <div class="adv-group__row adv-group__row--wrap">
          <button
            v-for="code in acquisitionOptions"
            :key="code"
            type="button"
            class="adv-chip"
            :class="{
              'adv-chip--active': filters.acquisition.includes(code),
            }"
            @click="toggleAcquisition(code)"
          >
            {{ currencyDisplayLabel(code) }}
          </button>
        </div>
      </fieldset>
    </div>
  </section>
</template>

<style scoped>
.adv-filters {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 18px;
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.adv-group {
  margin: 0;
  padding: 10px 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 18, 30, 0.55);
  min-width: 0;
}

.adv-group--wide {
  grid-column: 1 / -1;
}

.adv-group legend {
  padding: 0 4px;
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.adv-group__row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.adv-group__row--wrap {
  align-items: flex-start;
}

.adv-group__sub {
  min-width: 5.5rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
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
