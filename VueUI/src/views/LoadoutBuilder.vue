<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  SetBonusesDocument,
  ShipDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  type InfoboxesQuery,
  type StarshipTraitsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import WikiIcon from "@/components/shared/WikiIcon.vue";
import { useCollectionStore } from "@/stores/collection";
import {
  resolvedBindForEntry,
  visibleCatalogIds,
} from "@/logic/collection/state";
import { bindScopeFromCatalog } from "@/logic/collection/catalogBind";
import type { CollectionEntry } from "@/logic/collection/types";
import { displayInfoboxType } from "@/logic/collection/itemBrowser";
import {
  buildHullSlots,
  groupHullSlots,
  slotForGrantedConsole,
  type HullSlot,
} from "@/logic/loadout/hullSlots";
import {
  fillForSlot,
  loadoutsForCharacter,
  orphanedFills,
} from "@/logic/loadout/state";
import {
  equippedItemsForLoadout,
  itemFitsHullSlot,
  loadoutOwnershipKey,
  matchSetBonuses,
} from "@/logic/loadout/setBonus";
import { ownedKeysIncludingHullGrants } from "@/logic/loadout/hullGrants";
import type { EquipFailure, LoadoutItem } from "@/logic/loadout/types";
import { getItemImageUrl, getStarshipTraitImageUrl } from "@/utils/wikiImage";

const EQUIP_ERROR: Record<EquipFailure, string> = {
  "no-character": "Create a captain first.",
  "unknown-loadout": "That loadout is missing.",
  "unknown-slot": "That slot is not on this hull.",
  "unknown-item": "That item is not in the catalog.",
  "not-owned": "Collect this item before seating it.",
  "illegal-slot": "That item does not fit this slot.",
  "equip-limit": "This unique item is already seated.",
};

const route = useRoute();
const router = useRouter();
const store = useCollectionStore();
const { activeCharacter, state } = storeToRefs(store);

const shipId = computed(() => Number(route.params.id));
const selectedId = ref<string | null>(
  typeof route.query.loadout === "string" ? route.query.loadout : null,
);

const { result: shipResult, loading: shipLoading, error: shipError } = useQuery(
  ShipDocument,
  () => ({ id: shipId.value }),
);
const { result: shipsResult } = useQuery(ShipsDocument);
const { result: itemsResult, loading: itemsLoading } = useQuery(InfoboxesDocument);
const { result: traitsResult, loading: traitsLoading } = useQuery(
  StarshipTraitsDocument,
);
const { result: setsResult } = useQuery(SetBonusesDocument);

const ship = computed(() => shipResult.value?.ship ?? null);
const fleetShips = computed(() => {
  const byId = new Map(
    (shipsResult.value?.ships ?? []).map((row) => [row.id, row]),
  );
  if (ship.value) byId.set(ship.value.id, ship.value);
  return [...byId.values()];
});
const hullSlots = computed(() => (ship.value ? buildHullSlots(ship.value) : []));
const slotSections = computed(() => groupHullSlots(hullSlots.value));

const catalogItems = computed<LoadoutItem[]>(() => [
  ...(itemsResult.value?.infoboxes ?? []).map(toLoadoutItem),
  ...(traitsResult.value?.starshipTraits ?? []).map(toLoadoutTrait),
]);

const itemByKey = computed(() => {
  const map = new Map<string, LoadoutItem>();
  for (const item of catalogItems.value) {
    map.set(loadoutOwnershipKey(item.catalogKind, item.id), item);
  }
  return map;
});

const catalogBindSources = computed(() => ({
  ships: fleetShips.value,
  starshipTraits: traitsResult.value?.starshipTraits ?? [],
  items: itemsResult.value?.infoboxes ?? [],
}));

const ownedKeys = computed(() => {
  const bindFor = (entry: CollectionEntry) =>
    resolvedBindForEntry(
      entry,
      bindScopeFromCatalog(
        catalogBindSources.value,
        entry.kind,
        entry.catalogId,
      ),
    );
  return ownedKeysIncludingHullGrants({
    ownedItemIds: visibleCatalogIds(state.value, "item", bindFor),
    ownedTraitIds: visibleCatalogIds(state.value, "starshipTrait", bindFor),
    ownedShipIds: visibleCatalogIds(state.value, "ship", bindFor),
    ships: fleetShips.value,
    traits: traitsResult.value?.starshipTraits ?? [],
    items: itemsResult.value?.infoboxes ?? [],
  });
});

const shipLoadouts = computed(() =>
  loadoutsForCharacter(state.value, state.value.activeCharacterId, shipId.value),
);

const activeLoadout = computed(
  () =>
    shipLoadouts.value.find((loadout) => loadout.id === selectedId.value) ??
    shipLoadouts.value[0] ??
    null,
);

const equippedItems = computed(() =>
  equippedItemsForLoadout(activeLoadout.value, catalogItems.value),
);

const setBonuses = computed(() =>
  matchSetBonuses(equippedItems.value, setsResult.value?.setBonuses ?? []),
);

const warnings = computed(() => {
  const loadout = activeLoadout.value;
  if (!loadout) return [];
  return orphanedFills(
    loadout,
    new Set(hullSlots.value.map((slot) => slot.id)),
    ownedKeys.value,
  );
});

const pickerOpen = ref(false);
const pickerSlot = ref<HullSlot | null>(null);
const pickerSearch = ref("");
const pickerError = ref("");
const draftName = ref("");
const pendingUniqueSeatId = ref<string | null>(null);

const pickerCandidates = computed(() => {
  const slot = pickerSlot.value;
  if (!slot) return [];
  const query = pickerSearch.value.trim().toLowerCase();
  return ownedFittingItems(slot.kind).filter((item) =>
    query ? item.name.toLowerCase().includes(query) : true,
  );
});

watch(
  [ship, activeCharacter, shipLoadouts],
  () => {
    if (!ship.value || !activeCharacter.value) return;
    if (shipLoadouts.value.length === 0) {
      const created = store.addLoadout(ship.value.id);
      if (created) {
        selectedId.value = created.id;
        pendingUniqueSeatId.value = created.id;
      }
      return;
    }
    if (
      selectedId.value == null ||
      !shipLoadouts.value.some((loadout) => loadout.id === selectedId.value)
    ) {
      selectedId.value = shipLoadouts.value[0]?.id ?? null;
    }
  },
  { immediate: true },
);

watch(selectedId, (id) => {
  if (!id) return;
  if (route.query.loadout === id) return;
  router.replace({ query: { ...route.query, loadout: id } });
});

function toLoadoutItem(row: InfoboxesQuery["infoboxes"][number]): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    rarity: row.rarity,
    image: getItemImageUrl(row.image, row.name),
    equiplimit: row.equiplimit,
    catalogKind: "item",
  };
}

function toLoadoutTrait(
  row: StarshipTraitsQuery["starshipTraits"][number],
): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: "starship trait",
    image: getStarshipTraitImageUrl(row.name, row.iconName),
    equiplimit: 1,
    catalogKind: "starshipTrait",
  };
}

function ownedFittingItems(kind: HullSlot["kind"]): LoadoutItem[] {
  return catalogItems.value.filter(
    (item) =>
      ownedKeys.value.has(loadoutOwnershipKey(item.catalogKind, item.id)) &&
      itemFitsHullSlot(item, kind),
  );
}

function itemInSlot(slotId: string): LoadoutItem | null {
  const fill = fillForSlot(activeLoadout.value, slotId);
  if (!fill) return null;
  return (
    itemByKey.value.get(
      loadoutOwnershipKey(fill.catalogKind, fill.itemId),
    ) ?? null
  );
}

function slotTitle(slot: HullSlot): string {
  const item = itemInSlot(slot.id);
  if (item) return `${slot.label}: ${item.name}`;
  const owned = ownedFittingItems(slot.kind).length;
  if (owned === 0) return `Empty ${slot.label}`;
  return `Empty ${slot.label} · ${owned} owned`;
}

function equipContext() {
  return {
    hullSlots: hullSlots.value,
    items: catalogItems.value,
    ownedKeys: ownedKeys.value,
  };
}

function trySeatPendingUniqueConsole() {
  const loadoutId = pendingUniqueSeatId.value;
  if (!loadoutId) return;
  const loadout = shipLoadouts.value.find((row) => row.id === loadoutId);
  if (!loadout) return;
  if (loadout.slots.length > 0) {
    pendingUniqueSeatId.value = null;
    return;
  }
  const consoleId = ship.value?.uniconsoleId ?? ship.value?.uniConsole?.id;
  if (consoleId == null) {
    pendingUniqueSeatId.value = null;
    return;
  }
  const unique = catalogItems.value.find(
    (item) => item.id === consoleId && (item.catalogKind ?? "item") === "item",
  );
  if (!unique) return;
  const slot = slotForGrantedConsole(hullSlots.value, unique.type);
  if (!slot) {
    pendingUniqueSeatId.value = null;
    return;
  }
  const result = store.equipSlot(
    { loadoutId, slotId: slot.id, itemId: consoleId, catalogKind: "item" },
    equipContext(),
  );
  if (result.ok) {
    pendingUniqueSeatId.value = null;
    return;
  }
  if (result.reason === "unknown-item" || result.reason === "not-owned") {
    return;
  }
  pendingUniqueSeatId.value = null;
}

watch(
  [pendingUniqueSeatId, catalogItems, ownedKeys, hullSlots, shipLoadouts],
  trySeatPendingUniqueConsole,
);

function openPicker(slot: HullSlot) {
  pickerSlot.value = slot;
  pickerSearch.value = "";
  pickerError.value = "";
  pickerOpen.value = true;
}

function chooseItem(item: LoadoutItem) {
  const loadout = activeLoadout.value;
  const slot = pickerSlot.value;
  if (!loadout || !slot) return;
  const result = store.equipSlot(
    {
      loadoutId: loadout.id,
      slotId: slot.id,
      itemId: item.id,
      catalogKind: item.catalogKind,
    },
    equipContext(),
  );
  if (!result.ok) {
    pickerError.value = EQUIP_ERROR[result.reason];
    return;
  }
  pickerOpen.value = false;
}

function clearSlot(slotId: string) {
  const loadout = activeLoadout.value;
  if (!loadout) return;
  store.unequipSlot(loadout.id, slotId);
}

function clearPickerSlot() {
  if (!pickerSlot.value) return;
  clearSlot(pickerSlot.value.id);
  pickerOpen.value = false;
}

function createAnother() {
  if (!ship.value) return;
  const created = store.addLoadout(ship.value.id);
  if (created) {
    selectedId.value = created.id;
    pendingUniqueSeatId.value = created.id;
  }
}

function renameActive() {
  const loadout = activeLoadout.value;
  const name = draftName.value.trim();
  if (!loadout || !name) return;
  store.updateLoadoutName(loadout.id, name);
}

function removeActive() {
  const loadout = activeLoadout.value;
  if (!loadout) return;
  store.removeLoadout(loadout.id);
  selectedId.value = null;
}

watch(activeLoadout, (loadout) => {
  draftName.value = loadout?.name ?? "";
});

const loading = computed(
  () => shipLoading.value || itemsLoading.value || traitsLoading.value,
);
</script>

<template>
  <v-container class="loadout-page" fluid>
    <AppBreadcrumbs :title="ship?.name" />
    <loading-panel v-if="loading" message="Loadout" />
    <v-alert v-else-if="shipError" type="error">{{ shipError.message }}</v-alert>
    <v-alert v-else-if="!ship" type="warning">Ship not found.</v-alert>

    <template v-else>
      <header class="loadout-header">
        <div class="loadout-header__eyebrow">STO-AEGIS Array // Loadout</div>
        <h1 class="loadout-header__title">{{ ship.name }}</h1>
        <p class="loadout-header__lede">
          Seat collected gear into this hull’s legal slots. No DPS is predicted
          — this is inventory on a ship, not a combat sim.
        </p>
      </header>

      <div v-if="!activeCharacter" class="empty-featured">
        Create a captain in the header before saving a loadout.
      </div>

      <template v-else-if="activeLoadout">
        <div class="loadout-toolbar">
          <div class="loadout-toolbar__picks">
            <button
              v-for="loadout in shipLoadouts"
              :key="loadout.id"
              type="button"
              class="loadout-chip"
              :class="{ 'loadout-chip--active': loadout.id === activeLoadout.id }"
              @click="selectedId = loadout.id"
            >
              {{ loadout.name }}
            </button>
            <v-btn size="small" variant="text" color="primary" @click="createAnother">
              New loadout
            </v-btn>
          </div>
          <div class="loadout-toolbar__edit">
            <v-text-field
              v-model="draftName"
              density="compact"
              hide-details
              label="Loadout name"
              variant="outlined"
              @keydown.enter="renameActive"
              @blur="renameActive"
            />
            <v-btn variant="text" color="error" @click="removeActive">
              Delete
            </v-btn>
          </div>
        </div>

        <v-alert v-if="warnings.length" type="warning" variant="tonal" class="mb-4">
          {{ warnings.length }} seated item{{ warnings.length === 1 ? "" : "s" }}
          {{ warnings.length === 1 ? "is" : "are" }} missing from this captain’s
          collection or no longer match this hull.
        </v-alert>

        <div class="loadout-board">
          <div class="loadout-slots">
            <section
              v-for="section in slotSections"
              :key="section.group"
              class="equip-row"
            >
              <h2 class="equip-row__label">{{ section.label }}</h2>
              <div class="equip-row__slots">
                <button
                  v-for="slot in section.slots"
                  :key="slot.id"
                  type="button"
                  class="equip-slot"
                  :class="{ 'equip-slot--filled': itemInSlot(slot.id) }"
                  :title="slotTitle(slot)"
                  :aria-label="slotTitle(slot)"
                  @click="openPicker(slot)"
                >
                  <WikiIcon
                    v-if="itemInSlot(slot.id)"
                    :src="itemInSlot(slot.id)?.image"
                    :alt="itemInSlot(slot.id)?.name ?? ''"
                    :size="44"
                  />
                  <span
                    v-else-if="ownedFittingItems(slot.kind).length"
                    class="equip-slot__owned"
                  >
                    {{ ownedFittingItems(slot.kind).length }}
                  </span>
                </button>
              </div>
            </section>
          </div>

          <aside class="loadout-side">
            <section v-if="ship.uniConsole" class="side-card">
              <h2 class="slot-group__title">Ship console</h2>
              <p class="side-card__text">
                {{ ship.uniConsole.name }}
                <span v-if="ship.uniConsole.rarity">
                  · {{ ship.uniConsole.rarity }}
                </span>
              </p>
              <p class="side-card__hint">
                Granted with this hull. Seat it in a console slot — it can be
                removed and replaced.
              </p>
            </section>

            <section class="side-card">
              <h2 class="slot-group__title">Set bonuses</h2>
              <p v-if="setBonuses.length === 0" class="side-card__hint">
                Seat two or more pieces that share a set name to see bonuses.
              </p>
              <div v-for="set in setBonuses" :key="set.id" class="set-row">
                <div class="set-row__name">
                  {{ set.name }}
                  <span class="set-row__count">
                    {{ set.equipped }}/{{ set.required }}
                  </span>
                </div>
                <div class="set-row__status">
                  {{ set.complete ? "Complete" : "Partial" }}
                </div>
                <p v-if="set.passives" class="side-card__text">{{ set.passives }}</p>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </template>

    <v-dialog v-model="pickerOpen" max-width="560">
      <v-card>
        <v-card-title>
          Equip {{ pickerSlot?.label }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="pickerSearch"
            label="Search collection"
            hide-details
            class="mb-3"
            clearable
          />
          <v-alert v-if="pickerError" type="error" density="compact" class="mb-3">
            {{ pickerError }}
          </v-alert>
          <div v-if="pickerCandidates.length === 0" class="side-card__hint">
            No collected items fit this slot. Unique consoles and starship
            traits come from collected ships; weapons and gear come from
            collected items.
          </div>
          <button
            v-for="item in pickerCandidates"
            :key="loadoutOwnershipKey(item.catalogKind, item.id)"
            type="button"
            class="picker-row"
            @click="chooseItem(item)"
          >
            <WikiIcon :src="item.image" :alt="item.name" :size="36" />
            <div>
              <div class="slot-card__name">{{ item.name }}</div>
              <div class="slot-card__meta">
                {{ displayInfoboxType(item.type) }}
                <span v-if="item.rarity"> · {{ item.rarity }}</span>
              </div>
            </div>
          </button>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="pickerSlot && itemInSlot(pickerSlot.id)"
            variant="text"
            color="error"
            @click="clearPickerSlot"
          >
            Unequip
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="pickerOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.loadout-page {
  max-width: 1480px;
}

.loadout-header {
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
}

.loadout-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.loadout-header__title {
  margin: 0 0 8px;
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.loadout-header__lede {
  margin: 0;
  max-width: 46rem;
  color: rgba(255, 255, 255, 0.68);
}

.empty-featured {
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

.loadout-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.loadout-toolbar__picks,
.loadout-toolbar__edit {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.loadout-toolbar__edit {
  min-width: min(22rem, 100%);
}

.loadout-chip {
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.loadout-chip--active {
  border-color: rgba(125, 211, 252, 0.8);
  color: #7dd3fc;
}

.loadout-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18rem;
  gap: 1.25rem;
  align-items: start;
}

.loadout-slots {
  padding: 0.35rem 0.85rem 0.5rem;
  border-radius: 14px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background: #101b2a;
}

.equip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  min-height: 3.7rem;
  padding: 0.4rem 0.1rem;
  border-bottom: 1px solid rgba(125, 211, 252, 0.12);
}

.equip-row:last-child {
  border-bottom: 0;
}

.equip-row__label {
  margin: 0;
  flex: 1 1 auto;
  min-width: 7.5rem;
  font-size: 0.92rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.82);
}

.equip-row__slots {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.28rem;
}

.equip-slot {
  width: 3.25rem;
  height: 3.25rem;
  padding: 0.18rem;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: linear-gradient(160deg, #152336, #0d1624);
  color: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.equip-slot--filled {
  border-style: solid;
  border-color: rgba(125, 211, 252, 0.5);
}

.equip-slot__owned {
  font-size: 0.78rem;
  font-weight: 650;
  color: #7dd3fc;
}

.equip-slot:hover,
.equip-slot:focus-visible {
  border-color: rgba(125, 211, 252, 0.9);
}

.slot-group__title {
  margin: 0 0 0.65rem;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.slot-card__name {
  font-weight: 650;
  line-height: 1.25;
}

.slot-card__meta,
.side-card__hint {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.82rem;
}

.side-card {
  padding: 1rem 1.05rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #101b2a;
  margin-bottom: 1rem;
}

.side-card__text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.45;
}

.set-row {
  margin-bottom: 0.85rem;
}

.set-row__name {
  font-weight: 650;
}

.set-row__count,
.set-row__status {
  color: #7dd3fc;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.picker-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.2rem;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .loadout-board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .equip-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .equip-row__label {
    min-width: 0;
  }

  .equip-row__slots {
    flex: 1 1 100%;
  }
}
</style>
