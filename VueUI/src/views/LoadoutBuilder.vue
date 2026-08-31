<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  SetBonusesDocument,
  ShipDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  TraitsDocument,
  type InfoboxesQuery,
  type StarshipTraitsQuery,
  type TraitsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import WikiIcon from "@/components/shared/WikiIcon.vue";
import CaptainTraitsPanel from "@/components/loadout/CaptainTraitsPanel.vue";
import ShareBuildDialog from "@/components/loadout/ShareBuildDialog.vue";
import CombatLogPanel from "@/components/loadout/CombatLogPanel.vue";
import { useCollectionStore } from "@/stores/collection";
import { useShareStore } from "@/stores/share";
import {
  resolvedBindForEntry,
  visibleCatalogIds,
  ownedCopyCount,
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
  itemHasOpenCopy,
  loadoutOwnershipKey,
  matchSetBonuses,
} from "@/logic/loadout/setBonus";
import { ownedKeysIncludingHullGrants } from "@/logic/loadout/hullGrants";
import {
  buildCaptainTraitSlots,
  captainTraitOwnershipKey,
  fillForCaptainSlot,
  groupCaptainTraitSlots,
  shipSpecificSectionLabel,
  traitFitsCaptainSlot,
  type CaptainTraitGroup,
  type CaptainTraitSlot,
  type CaptainTraitSource,
} from "@/logic/loadout/captainTraits";
import {
  careerLabel,
  factionLabel,
  raceLabel,
} from "@/logic/captain/identity";
import {
  aggregateLoadoutCosts,
  formatAggregatedAmount,
  seatedItemsForCosts,
  splitShipAbilities,
} from "@/logic/loadout/loadoutCosts";
import type { LoadoutItem } from "@/logic/loadout/types";
import {
  loadoutItemSearchText,
  matchesPickerQuery,
} from "@/logic/loadout/pickerSearch";
import {
  preferredItemIdsForNextSlot,
  rankPickerCandidates,
} from "@/logic/loadout/pickerRank";
import { collectRequestsForSeated } from "@/logic/loadout/collectSeated";
import { encodeSharePayload } from "@/logic/share/payload";
import {
  displayedMark,
  displayedQuality,
  ITEM_MARKS,
  ITEM_QUALITIES,
  qualityColor,
  slotUsesItemMods,
  type ItemQuality,
} from "@/logic/loadout/slotQuality";
import { getItemImageUrl, getStarshipTraitImageUrl, getTraitImageUrl } from "@/utils/wikiImage";

const EQUIP_ERROR: Record<string, string> = {
  "no-character": "Create a captain first.",
  "unknown-loadout": "That loadout is missing.",
  "unknown-slot": "That slot is not on this hull.",
  "unknown-item": "That item is not in the catalog.",
  "not-owned": "Collect this item before seating it.",
  "illegal-slot": "That item does not fit this slot.",
  "equip-limit": "This unique item is already seated.",
  "locked-slot": "That slot is locked.",
};

function equipMessage(reason: string): string {
  return EQUIP_ERROR[reason] ?? reason;
}

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
const { result: personalTraitsResult, loading: personalTraitsLoading } =
  useQuery(TraitsDocument);
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
const captainSlots = computed(() =>
  buildCaptainTraitSlots({
    faction: activeCharacter.value?.faction,
    race: activeCharacter.value?.race,
  }),
);

const catalogItems = computed<LoadoutItem[]>(() => [
  ...(itemsResult.value?.infoboxes ?? []).map(toLoadoutItem),
  ...(traitsResult.value?.starshipTraits ?? []).map(toLoadoutTrait),
  ...(personalTraitsResult.value?.traits ?? []).map(toLoadoutPersonalTrait),
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

function bindForEntry(entry: CollectionEntry) {
  return resolvedBindForEntry(
    entry,
    bindScopeFromCatalog(
      catalogBindSources.value,
      entry.kind,
      entry.catalogId,
    ),
  );
}

const ownedShipIds = computed(() =>
  visibleCatalogIds(state.value, "ship", bindForEntry),
);

const ownedKeys = computed(() => {
  const keys = ownedKeysIncludingHullGrants({
    ownedItemIds: visibleCatalogIds(state.value, "item", bindForEntry),
    ownedTraitIds: visibleCatalogIds(state.value, "starshipTrait", bindForEntry),
    ownedShipIds: ownedShipIds.value,
    ships: fleetShips.value,
    traits: traitsResult.value?.starshipTraits ?? [],
    items: itemsResult.value?.infoboxes ?? [],
  });
  for (const id of visibleCatalogIds(state.value, "trait", bindForEntry)) {
    keys.add(captainTraitOwnershipKey("trait", id));
  }
  return keys;
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
const pickerHullSlot = ref<HullSlot | null>(null);
const pickerCaptainSlot = ref<CaptainTraitSlot | null>(null);
const pickerSearch = ref("");
const pickerError = ref("");
const draftName = ref("");
const pendingUniqueSeatId = ref<string | null>(null);
const onlyCollected = ref(true);
const shareOpen = ref(false);
const shareStore = useShareStore();

const sharePayload = computed(() => {
  if (!activeLoadout.value || !ship.value) return null;
  return encodeSharePayload({
    shipName: ship.value.wikiName,
    title: activeLoadout.value.name,
    loadout: activeLoadout.value,
    items: catalogItems.value,
  });
});

const activeShare = computed(() =>
  activeLoadout.value
    ? shareStore.forLoadout(activeLoadout.value.id)
    : null,
);

const pickerLabel = computed(
  () => pickerCaptainSlot.value?.label ?? pickerHullSlot.value?.label ?? "",
);

const pickerHasFill = computed(() => {
  if (pickerCaptainSlot.value) {
    return Boolean(itemInCaptainSlot(pickerCaptainSlot.value));
  }
  if (pickerHullSlot.value) {
    return Boolean(itemInSlot(pickerHullSlot.value.id));
  }
  return false;
});

const pickerCandidates = computed(() => {
  const query = (pickerSearch.value ?? "").trim().toLowerCase();
  const captainSlot = pickerCaptainSlot.value;
  const hullSlot = pickerHullSlot.value;
  const pool = captainSlot
    ? fittingCaptainTraits(captainSlot, onlyCollected.value, captainSlot.id)
    : hullSlot
      ? fittingItems(hullSlot.kind, onlyCollected.value, hullSlot.id)
      : [];
  const matched = pool.filter((item) => matchesPickerQuery(item, query));
  if (!hullSlot || captainSlot) return matched;
  return rankPickerCandidates(
    matched,
    preferredItemIdsForNextSlot(
      hullSlots.value,
      activeLoadout.value?.slots ?? [],
      hullSlot,
    ),
  );
});

const collectAllRequests = computed(() => {
  const loadout = activeLoadout.value;
  if (!loadout) return [];
  return collectRequestsForSeated({
    fills: [
      ...loadout.slots,
      ...(activeCharacter.value?.traitSlots ?? []),
    ],
    items: catalogItems.value,
    ownedCount: (kind, catalogId) =>
      ownedCopyCount(state.value, { kind, catalogId }),
    bindFor: (kind, catalogId) =>
      bindScopeFromCatalog(catalogBindSources.value, kind, catalogId),
  });
});

const shipAbilities = computed(() => splitShipAbilities(ship.value?.abilities));

const loadoutCosts = computed(() =>
  aggregateLoadoutCosts({
    seated: seatedItemsForCosts({
      loadout: activeLoadout.value,
      captainFills: activeCharacter.value?.traitSlots,
      items: catalogItems.value,
    }),
    ownedKeys: ownedKeys.value,
    ownedShipIds: ownedShipIds.value,
    ships: fleetShips.value,
    traits: traitsResult.value?.starshipTraits ?? [],
  }),
);

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
    who: row.who,
    searchText: loadoutItemSearchText(row),
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

function toLoadoutPersonalTrait(row: TraitsQuery["traits"][number]): LoadoutItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    image: getTraitImageUrl(row.name, row.iconName),
    equiplimit: 1,
    catalogKind: "trait",
    environment: row.environment,
    career: row.career,
    required: row.required,
    who: row.source,
  };
}

function seatedFills() {
  return [
    ...(activeLoadout.value?.slots ?? []),
    ...(activeCharacter.value?.traitSlots ?? []),
  ];
}

function fittingItems(
  kind: HullSlot["kind"],
  collectedOnly: boolean,
  exceptSlotId?: string,
): LoadoutItem[] {
  return catalogItems.value.filter((item) => {
    if (!itemFitsHullSlot(item, kind)) return false;
    if (!itemHasOpenCopy(item, seatedFills(), exceptSlotId)) return false;
    if (!collectedOnly) return true;
    return ownedKeys.value.has(loadoutOwnershipKey(item.catalogKind, item.id));
  });
}

function ownedFittingItems(kind: HullSlot["kind"]): LoadoutItem[] {
  return fittingItems(kind, true);
}

function captainIdentity() {
  return {
    career: activeCharacter.value?.career,
    raceLabel: raceLabel(
      activeCharacter.value?.faction,
      activeCharacter.value?.race,
    ),
  };
}

function asCaptainTrait(item: LoadoutItem): CaptainTraitSource {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    environment: item.environment ?? null,
    career: item.career,
    required: item.required,
    catalogKind:
      item.catalogKind === "starshipTrait" ? "starshipTrait" : "trait",
    image: item.image,
  };
}

function fittingCaptainTraits(
  slot: CaptainTraitSlot,
  collectedOnly: boolean,
  exceptSlotId?: string,
): LoadoutItem[] {
  const identity = captainIdentity();
  return catalogItems.value.filter((item) => {
    if (!traitFitsCaptainSlot(asCaptainTrait(item), slot, identity)) return false;
    if (!itemHasOpenCopy(item, seatedFills(), exceptSlotId)) return false;
    if (!collectedOnly) return true;
    return ownedKeys.value.has(
      captainTraitOwnershipKey(
        item.catalogKind === "starshipTrait" ? "starshipTrait" : "trait",
        item.id,
      ),
    );
  });
}

function itemIsOwned(item: LoadoutItem): boolean {
  return ownedKeys.value.has(loadoutOwnershipKey(item.catalogKind, item.id));
}

function itemInCaptainSlot(slot: CaptainTraitSlot): LoadoutItem | null {
  const fill =
    slot.storage === "loadout"
      ? fillForSlot(activeLoadout.value, slot.id)
      : fillForCaptainSlot(activeCharacter.value?.traitSlots, slot.id);
  if (!fill) return null;
  return (
    itemByKey.value.get(
      loadoutOwnershipKey(fill.catalogKind, fill.itemId),
    ) ?? null
  );
}

function captainTraitSections(): Array<{
  group: CaptainTraitGroup;
  label: string;
  slots: Array<{
    slot: CaptainTraitSlot;
    item: { name: string; image?: string | null } | null;
    ownedCount?: number;
  }>;
}> {
  return groupCaptainTraitSlots(captainSlots.value).map((section) => ({
    group: section.group,
    label:
      section.group === "shipSpecific"
        ? shipSpecificSectionLabel(ship.value?.name)
        : section.label,
    slots: section.slots.map((slot) => ({
      slot,
      item: itemInCaptainSlot(slot),
      ownedCount: fittingCaptainTraits(slot, true).length,
    })),
  }));
}

const captainTraitBoard = computed(() => captainTraitSections());

const captainSubtitle = computed(() => {
  const captain = activeCharacter.value;
  if (!captain) return "";
  const parts = [
    careerLabel(captain.career),
    factionLabel(captain.faction),
    raceLabel(captain.faction, captain.race),
  ].filter(Boolean);
  if (parts.length === 0) {
    return "Edit this captain to set class, faction, and race.";
  }
  return parts.join(" · ");
});

function itemInSlot(slotId: string): LoadoutItem | null {
  const fill = fillForSlot(activeLoadout.value, slotId);
  if (!fill) return null;
  return (
    itemByKey.value.get(
      loadoutOwnershipKey(fill.catalogKind, fill.itemId),
    ) ?? null
  );
}

function slotQuality(slot: HullSlot): ItemQuality {
  return displayedQuality(
    fillForSlot(activeLoadout.value, slot.id),
    itemInSlot(slot.id)?.rarity,
  );
}

function slotFillStyle(slot: HullSlot): Record<string, string> | undefined {
  if (!itemInSlot(slot.id) || !slotUsesItemMods(slot.kind)) return undefined;
  return { "--slot-quality": qualityColor(slotQuality(slot)) };
}

function slotMark(slot: HullSlot): string {
  return displayedMark(
    fillForSlot(activeLoadout.value, slot.id),
    slot.kind,
    itemInSlot(slot.id)?.type,
  );
}

function onSlotQualityChange(slot: HullSlot, quality: ItemQuality) {
  const loadout = activeLoadout.value;
  if (!loadout || !itemInSlot(slot.id)) return;
  store.updateSlotMods(loadout.id, slot.id, { quality });
}

function onSlotMarkChange(slot: HullSlot, event: Event) {
  const loadout = activeLoadout.value;
  if (!loadout || !itemInSlot(slot.id)) return;
  store.updateSlotMods(loadout.id, slot.id, {
    mark: (event.target as HTMLSelectElement).value,
  });
}

function collectAllSeated() {
  const requests = collectAllRequests.value;
  if (requests.length === 0) return;
  store.collectMany(requests);
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
    requireOwned: onlyCollected.value,
  };
}

function trySeatPendingHullGrants() {
  const loadoutId = pendingUniqueSeatId.value;
  if (!loadoutId) return;
  const loadout = shipLoadouts.value.find((row) => row.id === loadoutId);
  if (!loadout) return;

  let waiting = false;

  const seatGrant = (itemId: number | null | undefined, slot: HullSlot | undefined) => {
    if (itemId == null || slot == null) return;
    if (
      loadout.slots.some(
        (fill) => fill.slotId === slot.id && fill.itemId === itemId,
      )
    ) {
      return;
    }
    const item = catalogItems.value.find(
      (row) => row.id === itemId && (row.catalogKind ?? "item") === "item",
    );
    if (!item) {
      waiting = true;
      return;
    }
    const result = store.equipSlot(
      { loadoutId, slotId: slot.id, itemId, catalogKind: "item" },
      equipContext(),
    );
    if (
      !result.ok &&
      (result.reason === "unknown-item" || result.reason === "not-owned")
    ) {
      waiting = true;
    }
  };

  const consoleId = ship.value?.uniconsoleId ?? ship.value?.uniConsole?.id;
  if (consoleId != null) {
    const unique = catalogItems.value.find(
      (item) => item.id === consoleId && (item.catalogKind ?? "item") === "item",
    );
    seatGrant(
      consoleId,
      unique
        ? slotForGrantedConsole(hullSlots.value, unique.type) ?? undefined
        : hullSlots.value.find((row) => row.kind === "universalConsole"),
    );
  }

  const weaponId =
    ship.value?.experimentalWeaponId ?? ship.value?.experimentalWeaponItem?.id;
  seatGrant(
    weaponId,
    hullSlots.value.find((row) => row.kind === "experimental"),
  );

  if (!waiting) pendingUniqueSeatId.value = null;
}

watch(
  [pendingUniqueSeatId, catalogItems, ownedKeys, hullSlots, shipLoadouts],
  trySeatPendingHullGrants,
);

function openPicker(slot: HullSlot) {
  pickerHullSlot.value = slot;
  pickerCaptainSlot.value = null;
  pickerSearch.value = "";
  pickerError.value = "";
  pickerOpen.value = true;
}

function openCaptainPicker(slot: CaptainTraitSlot) {
  if (slot.locked) return;
  pickerCaptainSlot.value = slot;
  pickerHullSlot.value = null;
  pickerSearch.value = "";
  pickerError.value = "";
  pickerOpen.value = true;
}

function chooseItem(item: LoadoutItem) {
  const captainSlot = pickerCaptainSlot.value;
  if (captainSlot) {
    if (captainSlot.storage === "loadout") {
      const loadout = activeLoadout.value;
      if (!loadout) return;
      const result = store.equipSlot(
        {
          loadoutId: loadout.id,
          slotId: captainSlot.id,
          itemId: item.id,
          catalogKind: "starshipTrait",
        },
        equipContext(),
      );
      if (!result.ok) {
        pickerError.value = equipMessage(result.reason);
        return;
      }
      pickerOpen.value = false;
      return;
    }
    const result = store.equipCaptainTrait(
      {
        slotId: captainSlot.id,
        itemId: item.id,
        catalogKind:
          item.catalogKind === "starshipTrait" ? "starshipTrait" : "trait",
      },
      {
        slots: captainSlots.value,
        traits: catalogItems.value.map(asCaptainTrait),
        ownedKeys: ownedKeys.value,
        requireOwned: onlyCollected.value,
        career: activeCharacter.value?.career,
        raceLabel: raceLabel(
          activeCharacter.value?.faction,
          activeCharacter.value?.race,
        ),
      },
    );
    if (!result.ok) {
      pickerError.value = equipMessage(result.reason);
      return;
    }
    pickerOpen.value = false;
    return;
  }

  const loadout = activeLoadout.value;
  const slot = pickerHullSlot.value;
  if (!loadout || !slot) return;
  const result = store.equipSlot(
    {
      loadoutId: loadout.id,
      slotId: slot.id,
      itemId: item.id,
      catalogKind: item.catalogKind === "starshipTrait" ? "starshipTrait" : "item",
    },
    equipContext(),
  );
  if (!result.ok) {
    pickerError.value = equipMessage(result.reason);
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
  if (pickerCaptainSlot.value) {
    if (pickerCaptainSlot.value.storage === "loadout") {
      clearSlot(pickerCaptainSlot.value.id);
    } else {
      store.unequipCaptainTrait(pickerCaptainSlot.value.id);
    }
    pickerOpen.value = false;
    return;
  }
  if (!pickerHullSlot.value) return;
  clearSlot(pickerHullSlot.value.id);
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
  () =>
    shipLoading.value ||
    itemsLoading.value ||
    traitsLoading.value ||
    personalTraitsLoading.value,
);
</script>

<template>
  <v-container class="loadout-page" fluid>
    <AppBreadcrumbs :title="ship?.name" />
    <loading-panel v-if="loading" message="Build" />
    <v-alert v-else-if="shipError" type="error">{{ shipError.message }}</v-alert>
    <v-alert v-else-if="!ship" type="warning">Ship not found.</v-alert>

    <template v-else>
      <header class="loadout-header">
        <div class="loadout-header__eyebrow">STO-AEGIS Array // Build</div>
        <h1 class="loadout-header__title">{{ ship.name }}</h1>
        <p class="loadout-header__lede">
          Seat collected gear into this hull’s legal slots. No DPS is predicted
          — this is inventory on a ship, not a combat sim. Optionally attach a
          combat log to see measured DPS per fight.
        </p>
      </header>

      <div v-if="!activeCharacter" class="empty-featured">
        Create a captain in the header before saving a build.
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
              New build
            </v-btn>
          </div>
          <div class="loadout-toolbar__edit">
            <v-switch
              v-model="onlyCollected"
              color="primary"
              density="compact"
              hide-details
              label="Only Collected"
            />
            <v-text-field
              v-model="draftName"
              density="compact"
              hide-details
              label="Build name"
              variant="outlined"
              @keydown.enter="renameActive"
              @blur="renameActive"
            />
            <v-btn variant="text" color="primary" @click="shareOpen = true">
              {{ activeShare ? "Shared" : "Share" }}
            </v-btn>
            <v-btn variant="text" color="error" @click="removeActive">
              Delete
            </v-btn>
          </div>
        </div>

        <CombatLogPanel
          :captain-name="activeCharacter.name"
          :parse="activeLoadout.combatParse"
          @parsed="store.saveCombatParse(activeLoadout.id, $event)"
          @clear="store.removeCombatParse(activeLoadout.id)"
        />

        <v-alert v-if="warnings.length" type="warning" variant="tonal" class="mb-4">
          {{ warnings.length }} seated item{{ warnings.length === 1 ? "" : "s" }}
          {{ warnings.length === 1 ? "is" : "are" }} missing from this captain’s
          collection or no longer match this hull.
        </v-alert>

        <div class="loadout-board">
          <CaptainTraitsPanel
            class="captain-traits-board"
            title="Captain space traits"
            :subtitle="captainSubtitle"
            :sections="captainTraitBoard"
            @pick="openCaptainPicker"
          />

          <div class="loadout-slots">
            <section
              v-for="section in slotSections"
              :key="section.group"
              class="equip-row"
            >
              <h2 class="equip-row__label">{{ section.label }}</h2>
              <div class="equip-row__slots">
                <div v-for="slot in section.slots" :key="slot.id" class="equip-slot-cell">
                  <button
                    type="button"
                    class="equip-slot"
                    :class="{ 'equip-slot--filled': itemInSlot(slot.id) }"
                    :style="slotFillStyle(slot)"
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
                  <div
                    v-if="slotUsesItemMods(slot.kind)"
                    class="equip-slot__mods"
                    @click.stop
                  >
                    <v-menu
                      location="bottom"
                      :disabled="!itemInSlot(slot.id)"
                    >
                      <template #activator="{ props: menuProps }">
                        <button
                          v-bind="menuProps"
                          type="button"
                          class="equip-mod equip-mod--quality"
                          :disabled="!itemInSlot(slot.id)"
                          :aria-label="`${slot.label} quality: ${slotQuality(slot)}`"
                          :title="slotQuality(slot)"
                        >
                          <span
                            class="quality-dot"
                            :style="{ background: qualityColor(slotQuality(slot)) }"
                          />
                        </button>
                      </template>
                      <div class="quality-menu" role="listbox">
                        <button
                          v-for="quality in ITEM_QUALITIES"
                          :key="quality"
                          type="button"
                          class="quality-menu__choice"
                          :class="{
                            'quality-menu__choice--active':
                              quality === slotQuality(slot),
                          }"
                          :aria-label="quality"
                          :title="quality"
                          role="option"
                          @click="onSlotQualityChange(slot, quality)"
                        >
                          <span
                            class="quality-dot"
                            :style="{ background: qualityColor(quality) }"
                          />
                        </button>
                      </div>
                    </v-menu>
                    <select
                      class="equip-mod equip-mod--mark"
                      :value="slotMark(slot)"
                      :disabled="!itemInSlot(slot.id)"
                      :aria-label="`${slot.label} mark`"
                      @change="onSlotMarkChange(slot, $event)"
                    >
                      <option
                        v-for="mark in ITEM_MARKS"
                        :key="mark"
                        :value="mark"
                      >
                        {{ mark }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
            <div class="loadout-slots__actions">
              <v-btn
                color="primary"
                variant="outlined"
                :disabled="collectAllRequests.length === 0"
                @click="collectAllSeated"
              >
                Collect All
              </v-btn>
            </div>
          </div>

          <aside class="loadout-side">
            <section v-if="ship.uniConsole || ship.uniconsole" class="side-card">
              <h2 class="slot-group__title">Ship console</h2>
              <RouterLink
                v-if="ship.uniConsole"
                class="grant-link"
                :to="`/items/${ship.uniConsole.id}`"
              >
                <div class="slot-card__name">{{ ship.uniConsole.name }}</div>
                <div v-if="ship.uniConsole.rarity" class="slot-card__meta">
                  {{ ship.uniConsole.rarity }}
                </div>
              </RouterLink>
              <div v-else class="slot-card__name">{{ ship.uniconsole }}</div>
              <p class="side-card__hint">
                Granted with this hull. Seat it in a console slot — it can be
                removed and replaced.
              </p>
            </section>

            <section
              v-if="ship.experimentalWeaponItem || ship.experimentalWeapon"
              class="side-card"
            >
              <h2 class="slot-group__title">Experimental weapon</h2>
              <RouterLink
                v-if="ship.experimentalWeaponItem"
                class="grant-link"
                :to="`/items/${ship.experimentalWeaponItem.id}`"
              >
                <div class="slot-card__name">
                  {{ ship.experimentalWeaponItem.name }}
                </div>
                <div
                  v-if="ship.experimentalWeaponItem.rarity"
                  class="slot-card__meta"
                >
                  {{ ship.experimentalWeaponItem.rarity }}
                </div>
              </RouterLink>
              <div v-else class="slot-card__name">
                {{ ship.experimentalWeapon }}
              </div>
              <p class="side-card__hint">
                Granted with this hull. Seat it in the experimental slot — it
                can be removed and replaced.
              </p>
            </section>

            <section v-if="(ship.starshipTraits ?? []).length" class="side-card">
              <h2 class="slot-group__title">Starship traits</h2>
              <div
                v-for="trait in ship.starshipTraits ?? []"
                :key="trait.id"
                class="grant-block"
              >
                <RouterLink
                  class="grant-link"
                  :to="`/starship-traits/${trait.id}`"
                >
                  <div class="slot-card__name">{{ trait.name }}</div>
                </RouterLink>
                <p v-if="trait.short" class="side-card__text">{{ trait.short }}</p>
              </div>
            </section>

            <section v-if="shipAbilities.length" class="side-card">
              <h2 class="slot-group__title">Abilities</h2>
              <p
                v-for="ability in shipAbilities"
                :key="ability"
                class="side-card__text ability-line"
              >
                {{ ability }}
              </p>
            </section>

            <section class="side-card">
              <h2 class="slot-group__title">Costs</h2>
              <p
                v-if="
                  loadoutCosts.collected.length === 0 &&
                  loadoutCosts.notCollected.length === 0
                "
                class="side-card__hint"
              >
                Seat items to total their acquisition costs.
              </p>
              <template v-else>
                <h3 class="cost-heading">Collected</h3>
                <p
                  v-if="loadoutCosts.collected.length === 0"
                  class="side-card__hint"
                >
                  None
                </p>
                <div
                  v-for="line in loadoutCosts.collected"
                  :key="`collected-${line.currencyCode}`"
                  class="cost-row"
                >
                  <span class="cost-row__label">
                    <span
                      class="currency-dot"
                      :style="{ borderColor: line.color }"
                    />
                    {{ line.label }}
                  </span>
                  <span>{{ formatAggregatedAmount(line.amount) }}</span>
                </div>
                <h3 class="cost-heading">Not collected</h3>
                <p
                  v-if="loadoutCosts.notCollected.length === 0"
                  class="side-card__hint"
                >
                  None
                </p>
                <div
                  v-for="line in loadoutCosts.notCollected"
                  :key="`missing-${line.currencyCode}`"
                  class="cost-row"
                >
                  <span class="cost-row__label">
                    <span
                      class="currency-dot"
                      :style="{ borderColor: line.color }"
                    />
                    {{ line.label }}
                  </span>
                  <span>{{ formatAggregatedAmount(line.amount) }}</span>
                </div>
              </template>
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
        <v-card-title class="picker-title">
          <span>Equip {{ pickerLabel }}</span>
          <v-switch
            v-model="onlyCollected"
            color="primary"
            density="compact"
            hide-details
            label="Only Collected"
          />
        </v-card-title>
        <v-card-text>
          <v-text-field
            :model-value="pickerSearch"
            :label="onlyCollected ? 'Search collection' : 'Search items'"
            hide-details
            class="mb-3"
            clearable
            @update:model-value="pickerSearch = $event ?? ''"
          />
          <v-alert v-if="pickerError" type="error" density="compact" class="mb-3">
            {{ pickerError }}
          </v-alert>
          <div v-if="pickerCandidates.length === 0" class="side-card__hint">
            <template v-if="pickerCaptainSlot && onlyCollected">
              No collected traits fit this slot for this captain. Class and
              race lock some personal traits. Turn off Only Collected to browse
              the full catalog.
            </template>
            <template v-else-if="onlyCollected">
              No collected items fit this slot. Unique consoles and starship
              traits come from collected ships; weapons and gear come from
              collected items. Turn off Only Collected to browse the full
              catalog.
            </template>
            <template v-else>
              No items fit this slot.
            </template>
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
                <span v-if="!itemIsOwned(item)"> · Not collected</span>
              </div>
            </div>
          </button>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="pickerHasFill"
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
      <ShareBuildDialog
        v-if="activeLoadout"
        v-model:open="shareOpen"
        :loadout-id="activeLoadout.id"
        :payload="sharePayload"
      />
  </v-container>
</template>

<style scoped>
.loadout-page {
  max-width: 1680px;
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
  grid-template-columns: minmax(18.5rem, 22rem) minmax(0, 1fr) 18rem;
  gap: 1.25rem;
  align-items: start;
}

.captain-traits-board {
  min-width: 0;
}

.loadout-slots {
  padding: 0.35rem 0.85rem 0.5rem;
  border-radius: 14px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background: #101b2a;
}

.equip-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.85rem;
  min-height: 3.7rem;
  padding: 0.55rem 0.1rem;
  border-bottom: 1px solid rgba(125, 211, 252, 0.12);
}

.equip-row:last-child {
  border-bottom: 0;
}

.equip-row__label {
  margin: 0;
  flex: 1 1 auto;
  min-width: 7.5rem;
  padding-top: 0.85rem;
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

.equip-slot-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 5.6rem;
  gap: 0.18rem;
}

.equip-slot {
  width: 100%;
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
  border-color: var(--slot-quality, rgba(125, 211, 252, 0.5));
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

.equip-slot--filled:hover,
.equip-slot--filled:focus-visible {
  border-color: var(--slot-quality, rgba(125, 211, 252, 0.9));
}

.equip-slot__mods {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  gap: 0.15rem;
}

.equip-mod {
  width: 100%;
  min-width: 0;
  height: 1.45rem;
  padding: 0 0.12rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #0d1624;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.68rem;
  line-height: 1.2;
}

.equip-mod--quality {
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.equip-mod--mark {
  text-align: center;
}

.quality-dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.45);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.quality-menu {
  display: flex;
  gap: 0.28rem;
  padding: 0.4rem 0.45rem;
  border-radius: 8px;
  background: #101b2a;
  border: 1px solid rgba(125, 211, 252, 0.28);
}

.quality-menu__choice {
  display: grid;
  place-items: center;
  width: 1.45rem;
  height: 1.45rem;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.quality-menu__choice--active {
  border-color: rgba(125, 211, 252, 0.85);
}

.equip-mod:disabled {
  opacity: 0.4;
  cursor: default;
}

.equip-mod:focus-visible,
.quality-menu__choice:focus-visible {
  outline: 1px solid rgba(125, 211, 252, 0.8);
}

.loadout-slots__actions {
  display: flex;
  justify-content: flex-start;
  padding: 0.75rem 0.1rem 0.35rem;
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

.ability-line + .ability-line {
  margin-top: 0.45rem;
}

.grant-link {
  color: inherit;
  text-decoration: none;
}

.grant-link:hover .slot-card__name,
.grant-link:focus-visible .slot-card__name {
  color: #7dd3fc;
}

.grant-block + .grant-block {
  margin-top: 0.85rem;
}

.cost-heading {
  margin: 0.85rem 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
}

.cost-heading:first-of-type {
  margin-top: 0;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.2rem 0;
  font-size: 0.88rem;
}

.cost-row__label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.currency-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  border: 2px solid #fff;
  background: transparent;
  flex: 0 0 auto;
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

.picker-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

@media (max-width: 1280px) {
  .loadout-board {
    grid-template-columns: minmax(0, 1fr) 18rem;
  }

  .captain-traits-board {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1100px) {
  .loadout-board {
    grid-template-columns: 1fr;
  }

  .captain-traits-board {
    grid-column: auto;
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
