<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { ShipsDocument, type ShipsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import AdvancedShipSearchFilters from "@/components/ships/AdvancedShipSearchFilters.vue";
import {
  createDefaultAdvancedShipSearchFilters,
  filterAdvancedShipSearchRows,
  indexAdvancedShipSearchRows,
  type AdvancedShipSearchFilters as ShipSearchFilters,
  type AdvancedShipSearchRow,
} from "@/logic/advancedShipSearch";

defineOptions({ name: "AdvancedShipSearch" });

const router = useRouter();
type Ship = ShipsQuery["ships"][number];

const { result, loading, error } = useQuery(ShipsDocument);
const ships = computed<Ship[]>(() => result.value?.ships ?? []);

const filters = ref<ShipSearchFilters>(
  createDefaultAdvancedShipSearchFilters(),
);

const indexedRows = computed(() => indexAdvancedShipSearchRows(ships.value));

const filteredRows = computed(() =>
  filterAdvancedShipSearchRows(indexedRows.value, filters.value),
);

type TableRow = AdvancedShipSearchRow & {
  fullSpecLabel: string;
  experimentalLabel: string;
  secondaryDeflectorLabel: string;
  dualCannonsLabel: string;
  fleetAvailableLabel: string;
};

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function fullSpecLabel(row: AdvancedShipSearchRow): string {
  return row.fullSpecs.length > 0 ? row.fullSpecs.join(", ") : "None";
}

const tableItems = computed<TableRow[]>(() =>
  filteredRows.value.map((row) => ({
    ...row,
    fullSpecLabel: fullSpecLabel(row),
    experimentalLabel: yesNo(row.experimental),
    secondaryDeflectorLabel: yesNo(row.secondaryDeflector),
    dualCannonsLabel: yesNo(row.dualCannons),
    fleetAvailableLabel: yesNo(row.fleetAvailable),
  })),
);

const headers = [
  { title: "Ship", key: "name" },
  { title: "Fore", key: "foreWeapons" },
  { title: "Aft", key: "aftWeapons" },
  { title: "Exp", key: "experimentalLabel" },
  { title: "Total Weapons", key: "totalWeapons" },
  { title: "Full-spec", key: "fullSpecLabel" },
  { title: "Sec. def", key: "secondaryDeflectorLabel" },
  { title: "Hangars", key: "hangars" },
  { title: "Consoles", key: "consoleLabel" },
  { title: "Dual cannons", key: "dualCannonsLabel" },
  { title: "Acquisition", key: "acquisitionLabel" },
  { title: "Faction", key: "faction" },
  { title: "Fleet avail.", key: "fleetAvailableLabel" },
];

function onRowClick(_event: Event, row: { item: TableRow }) {
  router.push(`/ships/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container class="adv-search-page" fluid>
    <loading-panel v-if="loading" message="Advanced Ship Search" />
    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <template v-else>
      <header class="adv-header">
        <div class="adv-header__eyebrow">
          STO-AEGIS Array // Vessel Database
        </div>
        <div class="adv-header__row">
          <div>
            <h1 class="adv-header__title">Advanced Ship Search</h1>
            <p class="adv-header__lede">
              Optional layout filters over the catalog. Empty filters show every
              hull; multi-selects OR within a dimension.
            </p>
          </div>
          <div class="adv-header__actions">
            <div class="adv-header__counts">
              <div>{{ ships.length }} vessels catalogued</div>
              <div>{{ tableItems.length }} results</div>
            </div>
            <v-btn to="/ships" size="small" variant="outlined">
              Ship Registry
            </v-btn>
          </div>
        </div>
      </header>

      <AdvancedShipSearchFilters
        v-model="filters"
        :rows="indexedRows"
        :sources="ships"
      />

      <v-data-table
        class="adv-table"
        :headers="headers"
        :items="tableItems"
        :items-per-page="25"
        item-value="id"
        density="compact"
        hover
        @click:row="onRowClick"
      >
        <template #item.name="{ item }">
          <span class="adv-table__name">{{ item.name }}</span>
        </template>
      </v-data-table>
    </template>
  </v-container>
</template>

<style scoped>
.adv-search-page {
  max-width: 1600px;
}

.adv-header {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
}

.adv-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.adv-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.adv-header__title {
  margin: 0 0 6px;
  font-size: clamp(1.6rem, 2.8vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.adv-header__lede {
  margin: 0;
  max-width: 42rem;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.95rem;
}

.adv-header__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.adv-header__counts {
  text-align: right;
  color: #7dd3fc;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  line-height: 1.45;
}

.adv-table {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.adv-table__name {
  color: #e8f4ff;
  font-weight: 600;
}

.adv-table :deep(tbody tr) {
  cursor: pointer;
}

@media (max-width: 700px) {
  .adv-header__actions {
    align-items: flex-start;
  }

  .adv-header__counts {
    text-align: left;
  }
}
</style>
