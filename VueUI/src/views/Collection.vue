<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  TraitsDocument,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import CollectionBackup from "@/components/collection/CollectionBackup.vue";
import { useCollectionStore } from "@/stores/collection";
import {
  resolvedBindForEntry,
  visibleEntriesForActiveCharacter,
} from "@/logic/collection/state";
import {
  allowsAccountUnlockFromCatalog,
  bindChoicePromptFromCatalog,
  bindScopeFromCatalog,
} from "@/logic/collection/catalogBind";
import type {
  BindScope,
  CatalogKind,
  CollectionEntry,
} from "@/logic/collection/types";
import { displayInfoboxType } from "@/logic/collection/itemBrowser";
import {
  collectionKindEmptyCopy,
  groupCollectionByKind,
  resolveCollectionTab,
} from "@/logic/collection/kindTabs";
import {
  groupCollectionByFaction,
  resolveCollectionFactionTab,
  type CollectionFactionTabId,
} from "@/logic/collection/factionTabs";
import {
  readStoredCollectionListSort,
  sortRowsByName,
  toggleCollectionListSortDirection,
  writeStoredCollectionListSort,
  type CollectionListSortDirection,
} from "@/logic/collection/listSort";
import {
  COLLECTION_SHIPS_FILTERS_KEY,
  createDefaultShipsListFilters,
  createDefaultShipsListState,
  filterItemsByShip,
  readStoredShipsListState,
  shipsListFiltersAreActive,
  shipsListFiltersFromState,
  writeStoredShipsListState,
  type ShipListItem,
  type ShipsListFilters,
} from "@/logic/shipsBinder";
import { getShipImageUrl } from "@/utils/shipImage";
import {
  getItemImageUrl,
  getStarshipTraitImageUrl,
  getTraitImageUrl,
} from "@/utils/wikiImage";
import WikiIcon from "@/components/shared/WikiIcon.vue";
import CompareToggle from "@/components/compare/CompareToggle.vue";
import CompareLaunch from "@/components/compare/CompareLaunch.vue";
import ShipsListFiltersBar from "@/components/ships/ShipsListFiltersBar.vue";
import BoffSeatChips from "@/components/ships/BoffSeatChips.vue";
import HullConsoleSummary from "@/components/ships/HullConsoleSummary.vue";
import { useAlignItemCatalog } from "@/composables/useAlignItemCatalog";
import { parseBoffSeats, type BoffSeatView } from "@/mappers/boffColors";
import type { HullConsoleShip } from "@/logic/loadout/consoleSummary";
import type { FactionIdentity } from "@/logic/resolvePrimaryFaction";

const route = useRoute();
const router = useRouter();
const store = useCollectionStore();
const { activeCharacter, activeAccount, state } = storeToRefs(store);

const { result: shipsResult } = useQuery(ShipsDocument);
const { result: traitsResult } = useQuery(TraitsDocument);
const { result: starshipResult } = useQuery(StarshipTraitsDocument);
const { result: itemsResult } = useQuery(InfoboxesDocument);
useAlignItemCatalog(() => itemsResult.value?.infoboxes);

type ShipHullPreview = HullConsoleShip &
  FactionIdentity & {
    id: number;
    name: string;
    type?: string | null;
    image?: string | null;
    displayClass?: string | null;
    displayPrefix?: string | null;
    displayType?: string | null;
    cost?: string | null;
  };

type Row = {
  entry: CollectionEntry;
  name: string;
  subtitle: string;
  to: string;
  imageSrc: string | null;
  bind: BindScope;
  allowAccountUnlock: boolean;
  bindChoicePrompt: string;
  ownedByActive: boolean;
  ownerName: string;
  ship: ShipHullPreview | null;
  boffSeats: BoffSeatView[];
};

function lookupName(
  kind: CatalogKind,
  id: number,
): {
  name: string;
  subtitle: string;
  boundto?: string | null;
  imageSrc: string | null;
  ship: ShipHullPreview | null;
} {
  if (kind === "ship") {
    const ship = shipsResult.value?.ships.find((row) => row.id === id) ?? null;
    return {
      name: ship?.name ?? `Ship #${id}`,
      subtitle: [ship?.type, ship?.tier != null ? `Tier ${ship.tier}` : null]
        .filter(Boolean)
        .join(" · "),
      imageSrc: getShipImageUrl(ship?.image),
      ship: ship
        ? {
            id: ship.id,
            name: ship.name,
            type: ship.type,
            tier: ship.tier,
            faction: ship.faction,
            factionLede: ship.factionLede,
            facSort: ship.facSort,
            image: ship.image,
            displayClass: ship.displayClass,
            displayPrefix: ship.displayPrefix,
            displayType: ship.displayType,
            cost: ship.cost,
            boffs: ship.boffs,
            engineeringSlots: ship.engineeringSlots,
            scienceSlots: ship.scienceSlots,
            tacticalSlots: ship.tacticalSlots,
            t5uConsole: ship.t5uConsole,
          }
        : null,
    };
  }
  if (kind === "trait") {
    const trait = traitsResult.value?.traits.find((row) => row.id === id);
    return {
      name: trait?.name ?? `Trait #${id}`,
      subtitle: [trait?.type, trait?.environment].filter(Boolean).join(" · "),
      imageSrc: getTraitImageUrl(trait?.name, trait?.iconName),
      ship: null,
    };
  }
  if (kind === "starshipTrait") {
    const trait = starshipResult.value?.starshipTraits.find(
      (row) => row.id === id,
    );
    return {
      name: trait?.name ?? `Starship trait #${id}`,
      subtitle: trait?.type ?? "",
      imageSrc: getStarshipTraitImageUrl(trait?.name, trait?.iconName),
      ship: null,
    };
  }
  const item = itemsResult.value?.infoboxes.find((row) => row.id === id);
  return {
    name: item?.name ?? `Item #${id}`,
    subtitle: [displayInfoboxType(item?.type), item?.rarity]
      .filter(Boolean)
      .join(" · "),
    boundto: item?.boundto,
    imageSrc: getItemImageUrl(item?.image, item?.name),
    ship: null,
  };
}

function detailsPath(kind: CatalogKind, id: number): string {
  if (kind === "ship") return `/ships/${id}`;
  if (kind === "trait") return `/traits/${id}`;
  if (kind === "starshipTrait") return `/starship-traits/${id}`;
  return `/items?id=${id}`;
}

const catalogSources = computed(() => ({
  ships: shipsResult.value?.ships ?? [],
  starshipTraits: starshipResult.value?.starshipTraits ?? [],
  items: itemsResult.value?.infoboxes ?? [],
}));

const rows = computed<Row[]>(() => {
  const sources = catalogSources.value;
  const visible = visibleEntriesForActiveCharacter(state.value, (entry) =>
    resolvedBindForEntry(
      entry,
      bindScopeFromCatalog(sources, entry.kind, entry.catalogId),
    ),
  );

  return visible.map((entry) => {
    const info = lookupName(entry.kind, entry.catalogId);
    const owner = state.value.characters.find(
      (character) => character.id === entry.characterId,
    );
    const catalogBind = bindScopeFromCatalog(
      sources,
      entry.kind,
      entry.catalogId,
    );
    return {
      entry,
      name: info.name,
      subtitle: info.subtitle,
      to: detailsPath(entry.kind, entry.catalogId),
      imageSrc: info.imageSrc,
      bind: resolvedBindForEntry(entry, catalogBind),
      allowAccountUnlock: allowsAccountUnlockFromCatalog(
        sources,
        entry.kind,
        entry.catalogId,
      ),
      bindChoicePrompt: bindChoicePromptFromCatalog(
        sources,
        entry.kind,
        entry.catalogId,
      ),
      ownedByActive: entry.characterId === state.value.activeCharacterId,
      ownerName: owner?.name ?? "Unknown captain",
      ship: info.ship,
      boffSeats: parseBoffSeats(info.ship?.boffs),
    };
  });
});

const catalogShips = computed<ShipListItem[]>(
  () => shipsResult.value?.ships ?? [],
);

const collectedShipIds = computed(() => store.ownedCatalogIds("ship"));

const storedCollectionShipFilters = readStoredShipsListState(
  sessionStorage,
  COLLECTION_SHIPS_FILTERS_KEY,
);
const shipFilters = ref<ShipsListFilters>(
  storedCollectionShipFilters
    ? shipsListFiltersFromState(storedCollectionShipFilters)
    : createDefaultShipsListFilters(),
);

watch(
  shipFilters,
  (filters) => {
    writeStoredShipsListState(
      { ...createDefaultShipsListState(), ...filters, page: 1 },
      sessionStorage,
      COLLECTION_SHIPS_FILTERS_KEY,
    );
  },
  { deep: true },
);

const sortDirection = ref<CollectionListSortDirection>(
  readStoredCollectionListSort().direction,
);

watch(sortDirection, (direction) => {
  writeStoredCollectionListSort({ direction });
});

function toggleSortDirection() {
  sortDirection.value = toggleCollectionListSortDirection(sortDirection.value);
}

function shipListItemForRow(row: Row): ShipListItem {
  const ship = catalogShips.value.find((item) => item.id === row.entry.catalogId);
  return {
    id: row.entry.catalogId,
    name: ship?.name ?? row.name,
    type: ship?.type ?? null,
    tier: ship?.tier ?? null,
    faction: ship?.faction ?? null,
    factionLede: ship?.factionLede ?? null,
    facSort: ship?.facSort,
    displayClass: ship?.displayClass,
    displayPrefix: ship?.displayPrefix,
    displayType: ship?.displayType,
    cost: ship?.cost,
  };
}

const tabs = computed(() =>
  groupCollectionByKind(rows.value, (row) => row.entry.kind),
);

const requestedTab = computed(() =>
  typeof route.query.tab === "string" ? route.query.tab : "",
);

const activeTab = ref<CatalogKind>(resolveCollectionTab(requestedTab.value));

watch(requestedTab, (tab) => {
  const next = resolveCollectionTab(tab);
  if (next !== activeTab.value) activeTab.value = next;
});

watch(activeTab, (kind) => {
  if (kind === requestedTab.value) return;
  void router.replace({ query: { ...route.query, tab: kind } });
});

const activeGroup = computed(
  () => tabs.value.find((tab) => tab.kind === activeTab.value) ?? tabs.value[0],
);

const filteredShipRows = computed(() => {
  const groupRows = activeGroup.value?.rows ?? [];
  if (activeTab.value !== "ship") return groupRows;
  return filterItemsByShip(
    groupRows,
    shipListItemForRow,
    shipFilters.value,
    collectedShipIds.value,
  );
});

const shipFactionTabs = computed(() =>
  groupCollectionByFaction(filteredShipRows.value, (row) => row.ship),
);

const requestedFaction = computed(() =>
  typeof route.query.faction === "string" ? route.query.faction : "",
);

const activeFactionTab = ref<CollectionFactionTabId | null>(
  resolveCollectionFactionTab(
    requestedFaction.value,
    shipFactionTabs.value.map((tab) => tab.id),
  ),
);

watch(
  [shipFactionTabs, requestedFaction],
  ([tabs, requested]) => {
    const next = resolveCollectionFactionTab(
      requested,
      tabs.map((tab) => tab.id),
    );
    if (next !== activeFactionTab.value) activeFactionTab.value = next;
  },
  { immediate: true },
);

watch(activeFactionTab, (faction) => {
  const current =
    typeof route.query.faction === "string" ? route.query.faction : "";
  if ((faction ?? "") === current) return;
  const query = { ...route.query };
  if (faction) query.faction = faction;
  else delete query.faction;
  void router.replace({ query });
});

const displayedRows = computed(() => {
  let groupRows = filteredShipRows.value;
  if (activeTab.value === "ship") {
    const factionTab = shipFactionTabs.value.find(
      (tab) => tab.id === activeFactionTab.value,
    );
    groupRows = factionTab?.rows ?? groupRows;
  }
  return sortRowsByName(groupRows, (row) => row.name, sortDirection.value);
});

const emptyCopy = computed(() => {
  if (!activeGroup.value) return "Nothing collected yet.";
  if (
    activeTab.value === "ship" &&
    activeGroup.value.rows.length > 0 &&
    displayedRows.value.length === 0 &&
    shipsListFiltersAreActive(shipFilters.value)
  ) {
    return "No ships match the current search and filters.";
  }
  if (
    activeTab.value === "ship" &&
    activeGroup.value.rows.length > 0 &&
    shipFactionTabs.value.length > 0 &&
    displayedRows.value.length === 0
  ) {
    return "No ships in this faction.";
  }
  return collectionKindEmptyCopy(activeGroup.value.kind);
});

const sortToggleLabel = computed(() =>
  sortDirection.value === "asc" ? "A → Z" : "Z → A",
);
</script>

<template>
  <app-breadcrumbs />
  <v-container class="collection-page" fluid>
    <header class="collection-header">
      <div class="collection-header__eyebrow">STO-AEGIS Array // Armory</div>
      <h1 class="collection-header__title">Collection</h1>
      <p class="collection-header__lede">
        {{
          activeCharacter
            ? `Items marked collected for ${activeCharacter.name}${
                activeAccount ? ` on ${activeAccount.name}` : ""
              }. Bound-to-account pieces from other captains on this STO account stay visible.`
            : "Create an account folder and a captain in the header to start a collection on this device."
        }}
      </p>
      <CollectionBackup />
      <CompareLaunch class="mt-3" />
    </header>

    <div v-if="!activeCharacter" class="empty-featured">
      No captain selected.
    </div>

    <template v-else>
      <v-tabs
        v-model="activeTab"
        color="primary"
        bg-color="transparent"
        show-arrows
        class="collection-tabs"
      >
        <v-tab v-for="tab in tabs" :key="tab.kind" :value="tab.kind">
          <v-icon start :icon="tab.icon" />
          {{ tab.label }}
          <span class="collection-tabs__count">{{ tab.rows.length }}</span>
        </v-tab>
      </v-tabs>

      <ShipsListFiltersBar
        v-if="activeTab === 'ship'"
        v-model="shipFilters"
        class="collection-ship-filters"
        :ships="catalogShips"
      />

      <div
        v-if="activeTab === 'ship' && shipFactionTabs.length > 0"
        class="collection-faction-tabs"
      >
        <v-tabs
          v-model="activeFactionTab"
          bg-color="transparent"
          show-arrows
          density="compact"
          class="collection-faction-tabs__bar"
        >
          <v-tab
            v-for="tab in shipFactionTabs"
            :key="tab.id"
            :value="tab.id"
            :style="{ '--faction-accent': tab.accent }"
            class="collection-faction-tabs__tab"
          >
            <span :class="`text-${tab.color}`">{{ tab.label }}</span>
            <span class="collection-tabs__count">{{ tab.rows.length }}</span>
          </v-tab>
        </v-tabs>
        <button
          type="button"
          class="collection-sort-toggle"
          :aria-label="`Sort names ${sortToggleLabel}`"
          :title="`Sort names ${sortToggleLabel}`"
          @click.stop="toggleSortDirection"
        >
          <v-icon
            size="18"
            :icon="
              sortDirection === 'asc'
                ? 'mdi-sort-alphabetical-ascending'
                : 'mdi-sort-alphabetical-descending'
            "
          />
          <span>{{ sortToggleLabel }}</span>
        </button>
      </div>

      <div v-else class="collection-toolbar">
        <button
          type="button"
          class="collection-sort-toggle"
          :aria-label="`Sort names ${sortToggleLabel}`"
          :title="`Sort names ${sortToggleLabel}`"
          @click.stop="toggleSortDirection"
        >
          <v-icon
            size="18"
            :icon="
              sortDirection === 'asc'
                ? 'mdi-sort-alphabetical-ascending'
                : 'mdi-sort-alphabetical-descending'
            "
          />
          <span>{{ sortToggleLabel }}</span>
        </button>
      </div>

      <div v-if="displayedRows.length === 0" class="empty-featured">
        {{ emptyCopy }}
      </div>

      <div v-else class="collection-list">
        <RouterLink
          v-for="row in displayedRows"
          :key="row.entry.id"
          :to="row.to"
          class="collection-row"
          :class="{ 'collection-row--ship': row.entry.kind === 'ship' }"
        >
          <div class="collection-row__main">
            <WikiIcon :src="row.imageSrc" :alt="row.name" :size="40" />
            <div>
              <div class="collection-row__name">{{ row.name }}</div>
              <div class="collection-row__meta">
                {{ row.subtitle }}
                <span v-if="!row.ownedByActive"> · On {{ row.ownerName }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="row.entry.kind === 'ship' && row.ship"
            class="collection-row__hull"
          >
            <HullConsoleSummary :ship="row.ship" />
            <BoffSeatChips
              v-if="row.boffSeats.length > 0"
              dense
              :seats="row.boffSeats"
            />
          </div>

          <div class="collection-row__actions" @click.stop>
            <div v-if="row.entry.kind === 'ship'" class="collection-row__toolbar">
              <CompareToggle
                compact
                :ship-id="row.entry.catalogId"
              />
              <v-btn
                :to="`/ships/${row.entry.catalogId}/loadout`"
                size="small"
                variant="text"
                color="primary"
                @click.stop
              >
                Build
              </v-btn>
            </div>
            <CollectToggle
              :kind="row.entry.kind"
              :catalog-id="row.entry.catalogId"
              :bind="row.bind"
              :allow-account-unlock="row.allowAccountUnlock"
              :bind-choice-prompt="row.bindChoicePrompt"
            />
          </div>
        </RouterLink>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.collection-page {
  max-width: 1480px;
}

.collection-header {
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
}

.collection-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.collection-header__title {
  margin: 0 0 8px;
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.collection-header__lede {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.collection-tabs {
  margin-bottom: 0.85rem;
}

.collection-tabs__count {
  margin-left: 0.35rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85em;
}

.collection-ship-filters {
  margin-bottom: 0.85rem;
}

.collection-faction-tabs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.collection-faction-tabs__bar {
  flex: 1;
  min-width: 0;
}

.collection-faction-tabs__tab {
  border-bottom: 2px solid transparent;
}

.collection-faction-tabs__tab.v-tab--selected {
  border-bottom-color: var(--faction-accent, rgba(var(--v-theme-primary)));
}

.collection-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.65rem;
}

.collection-sort-toggle {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.45);
  background: rgba(13, 40, 64, 0.85);
  color: #7dd3fc;
  font-size: 0.82rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.collection-sort-toggle:hover {
  border-color: rgba(125, 211, 252, 0.8);
  background: rgba(20, 56, 88, 0.95);
}

.collection-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.collection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 22, 36, 0.72);
}

.collection-row--ship {
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) minmax(0, 1.4fr) auto;
  align-items: center;
}

.collection-row__main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.collection-row__hull {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  justify-self: center;
  width: 100%;
  max-width: 36rem;
}

.collection-row__actions {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  flex-shrink: 0;
  justify-self: end;
}

.collection-row__toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.collection-row__name {
  font-weight: 650;
}

.collection-row__meta {
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.86rem;
}

.empty-featured {
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

@media (max-width: 900px) {
  .collection-row--ship {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .collection-row__hull {
    max-width: none;
    justify-self: stretch;
  }

  .collection-row__actions {
    justify-self: start;
  }
}
</style>
