<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  SetBonusesDocument,
  ShipDocument,
  type InfoboxesQuery,
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
import { displayInfoboxType } from "@/logic/collection/itemBrowser";
import {
  buildHullSlots,
  groupHullSlots,
  type HullSlot,
} from "@/logic/loadout/hullSlots";
import {
  filledSlotMap,
  loadoutsForCharacter,
  orphanedFills,
} from "@/logic/loadout/state";
import {
  equippedItemsForLoadout,
  itemFitsHullSlot,
  matchSetBonuses,
} from "@/logic/loadout/setBonus";
import type { EquipFailure, LoadoutItem } from "@/logic/loadout/types";
import { getItemImageUrl } from "@/utils/wikiImage";

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
const { result: itemsResult, loading: itemsLoading } = useQuery(InfoboxesDocument);
const { result: setsResult } = useQuery(SetBonusesDocument);

const ship = computed(() => shipResult.value?.ship ?? null);
const hullSlots = computed(() => (ship.value ? buildHullSlots(ship.value) : []));
const slotSections = computed(() => groupHullSlots(hullSlots.value));

const catalogItems = computed<LoadoutItem[]>(() =>
  (itemsResult.value?.infoboxes ?? []).map(toLoadoutItem),
);

const itemById = computed(() => {
  const map = new Map<number, LoadoutItem>();
  for (const item of catalogItems.value) map.set(item.id, item);
  return map;
});

const ownedItemIds = computed(() =>
  visibleCatalogIds(state.value, "item", (entry) =>
    resolvedBindForEntry(
      entry,
      bindScopeFromCatalog(
        {
          ships: ship.value ? [ship.value] : [],
          starshipTraits: [],
          items: itemsResult.value?.infoboxes ?? [],
        },
        entry.kind,
        entry.catalogId,
      ),
    ),
  ),
);

const shipLoadouts = computed(() =>
  loadoutsForCharacter(state.value, state.value.activeCharacterId, shipId.value),
);

const activeLoadout = computed(
  () =>
    shipLoadouts.value.find((loadout) => loadout.id === selectedId.value) ??
    shipLoadouts.value[0] ??
    null,
);

const fills = computed(() => filledSlotMap(activeLoadout.value));

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
    ownedItemIds.value,
  );
});

const pickerOpen = ref(false);
const pickerSlot = ref<HullSlot | null>(null);
const pickerSearch = ref("");
const pickerError = ref("");
const draftName = ref("");

const pickerCandidates = computed(() => {
  const slot = pickerSlot.value;
  if (!slot) return [];
  const query = pickerSearch.value.trim().toLowerCase();
  return catalogItems.value
    .filter((item) => ownedItemIds.value.has(item.id))
    .filter((item) => itemFitsHullSlot(item, slot.kind))
    .filter((item) =>
      query ? item.name.toLowerCase().includes(query) : true,
    );
});

watch(
  [ship, activeCharacter, shipLoadouts],
  () => {
    if (!ship.value || !activeCharacter.value) return;
    if (shipLoadouts.value.length === 0) {
      const created = store.addLoadout(ship.value.id);
      if (created) selectedId.value = created.id;
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
  };
}

function itemInSlot(slotId: string): LoadoutItem | null {
  const itemId = fills.value.get(slotId);
  if (itemId == null) return null;
  return itemById.value.get(itemId) ?? null;
}

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
    { loadoutId: loadout.id, slotId: slot.id, itemId: item.id },
    {
      hullSlots: hullSlots.value,
      items: catalogItems.value,
      ownedItemIds: ownedItemIds.value,
    },
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

function createAnother() {
  if (!ship.value) return;
  const created = store.addLoadout(ship.value.id);
  if (created) selectedId.value = created.id;
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

const loading = computed(() => shipLoading.value || itemsLoading.value);
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
              class="slot-group"
            >
              <h2 class="slot-group__title">{{ section.label }}</h2>
              <div class="slot-grid">
                <button
                  v-for="slot in section.slots"
                  :key="slot.id"
                  type="button"
                  class="slot-card"
                  :class="{ 'slot-card--filled': itemInSlot(slot.id) }"
                  @click="openPicker(slot)"
                >
                  <div class="slot-card__label">{{ slot.label }}</div>
                  <div v-if="itemInSlot(slot.id)" class="slot-card__item">
                    <WikiIcon
                      :src="itemInSlot(slot.id)?.image"
                      :alt="itemInSlot(slot.id)?.name ?? ''"
                      :size="40"
                    />
                    <div class="slot-card__copy">
                      <div class="slot-card__name">
                        {{ itemInSlot(slot.id)?.name }}
                      </div>
                      <div class="slot-card__meta">
                        {{ displayInfoboxType(itemInSlot(slot.id)?.type) }}
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      @click.stop="clearSlot(slot.id)"
                    />
                  </div>
                  <div v-else class="slot-card__empty">Click to equip from collection</div>
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
                Granted with the hull — not a player-fillable slot.
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
            No collected items fit this slot.
          </div>
          <button
            v-for="item in pickerCandidates"
            :key="item.id"
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

.slot-group {
  margin-bottom: 1.25rem;
}

.slot-group__title {
  margin: 0 0 0.65rem;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.65rem;
}

.slot-card {
  text-align: left;
  min-height: 5.5rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  background: linear-gradient(160deg, #152336, #0d1624);
  color: inherit;
  cursor: pointer;
}

.slot-card--filled {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.12);
}

.slot-card__label {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.4rem;
}

.slot-card__item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.slot-card__copy,
.slot-card__name {
  min-width: 0;
}

.slot-card__name {
  font-weight: 650;
  line-height: 1.25;
}

.slot-card__meta,
.slot-card__empty,
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
</style>
