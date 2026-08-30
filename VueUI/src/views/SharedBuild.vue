<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  InfoboxesDocument,
  SharedBuildDocument,
  ShipsDocument,
  StarshipTraitsDocument,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import WikiIcon from "@/components/shared/WikiIcon.vue";
import { useCollectionStore } from "@/stores/collection";
import { buildHullSlots, groupHullSlots } from "@/logic/loadout/hullSlots";
import type { SharePayload } from "@/logic/share/payload";
import { resolveShareSlots } from "@/logic/share/payload";
import { loadoutOwnershipKey } from "@/logic/loadout/setBonus";
import type { LoadoutItem } from "@/logic/loadout/types";
import { getItemImageUrl, getStarshipTraitImageUrl } from "@/utils/wikiImage";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";

const route = useRoute();
const router = useRouter();
const store = useCollectionStore();
const code = computed(() => String(route.params.code ?? ""));

const { result, loading, error } = useQuery(SharedBuildDocument, () => ({
  code: code.value,
}));
const { result: shipsResult } = useQuery(ShipsDocument);
const { result: itemsResult } = useQuery(InfoboxesDocument);
const { result: traitsResult } = useQuery(StarshipTraitsDocument);

const shared = computed(() => result.value?.sharedBuild ?? null);
const payload = computed<SharePayload | null>(() => {
  const raw = shared.value?.payload;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as SharePayload;
  if (value.v !== 1 || !Array.isArray(value.slots)) return null;
  return value;
});

const catalogItems = computed<LoadoutItem[]>(() => [
  ...(itemsResult.value?.infoboxes ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    image: getItemImageUrl(item.image, item.name),
    catalogKind: "item" as const,
  })),
  ...(traitsResult.value?.starshipTraits ?? []).map((trait) => ({
    id: trait.id,
    name: trait.name,
    type: trait.type,
    image: getStarshipTraitImageUrl(trait.iconName, trait.name),
    catalogKind: "starshipTrait" as const,
  })),
]);

const itemByKey = computed(() => {
  const map = new Map<string, LoadoutItem>();
  for (const item of catalogItems.value) {
    map.set(loadoutOwnershipKey(item.catalogKind, item.id), item);
  }
  return map;
});

const resolvedFills = computed(() =>
  payload.value
    ? resolveShareSlots(payload.value, catalogItems.value).slots
    : [],
);

const fillBySlot = computed(() => {
  const map = new Map<string, LoadoutItem>();
  for (const fill of resolvedFills.value) {
    const item = itemByKey.value.get(
      loadoutOwnershipKey(fill.catalogKind, fill.itemId),
    );
    if (item) map.set(fill.slotId, item);
  }
  return map;
});

const ship = computed(() => shared.value?.ship ?? null);
const slotSections = computed(() =>
  ship.value ? groupHullSlots(buildHullSlots(ship.value)) : [],
);

const copyError = computed(() => {
  if (!store.activeCharacter) return "Create a captain before copying this board.";
  return "";
});

function itemInSlot(slotId: string): LoadoutItem | null {
  return fillBySlot.value.get(slotId) ?? null;
}

function copyToCaptain() {
  if (!payload.value || !ship.value) return;
  const ships = (shipsResult.value?.ships ?? []).map((row) => ({
    id: row.id,
    wikiName: row.wikiName,
  }));
  if (!ships.some((row) => row.id === ship.value?.id)) {
    ships.push({ id: ship.value.id, wikiName: ship.value.wikiName });
  }
  const resultCopy = store.copySharedLoadout({
    payload: payload.value,
    items: catalogItems.value,
    ships,
  });
  if (!resultCopy.ok) return;
  void router.push(
    `/ships/${resultCopy.loadout.shipId}/loadout?loadout=${resultCopy.loadout.id}`,
  );
}
</script>

<template>
  <v-container class="shared-page" fluid>
    <AppBreadcrumbs :title="shared?.title" />
    <loading-panel v-if="loading" message="Shared build" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <v-alert v-else-if="!shared" type="warning">That share link was not found.</v-alert>
    <template v-else>
      <header class="shared-header">
        <div class="shared-header__eyebrow">STO-AEGIS Array // Shared</div>
        <h1 class="shared-header__title">{{ shared.title }}</h1>
        <p class="shared-header__lede">
          Anonymous snapshot
          <template v-if="shared.visibility === 'public'"> · public listing</template>
          <template v-else> · unlisted link</template>
          · {{ shared.fillCount }} seated
        </p>
        <div class="shared-header__actions">
          <v-btn
            v-if="ship"
            :to="`/ships/${ship.id}`"
            variant="text"
            color="primary"
          >
            {{ ship.name }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="Boolean(copyError)"
            @click="copyToCaptain"
          >
            Copy to captain
          </v-btn>
        </div>
        <p v-if="copyError" class="shared-header__hint">{{ copyError }}</p>
      </header>

      <div class="shared-board">
        <img
          v-if="ship"
          class="shared-art"
          :src="ship.image ? getShipImageUrl(ship.image) : FALLBACK_SHIP_IMAGE"
          :alt="ship.name"
        />
        <div class="loadout-slots">
          <section
            v-for="section in slotSections"
            :key="section.group"
            class="equip-row"
          >
            <h2 class="equip-row__label">{{ section.label }}</h2>
            <div class="equip-row__slots">
              <div
                v-for="slot in section.slots"
                :key="slot.id"
                class="equip-slot"
                :class="{ 'equip-slot--filled': itemInSlot(slot.id) }"
                :title="itemInSlot(slot.id)?.name ?? slot.label"
              >
                <WikiIcon
                  v-if="itemInSlot(slot.id)"
                  :src="itemInSlot(slot.id)?.image"
                  :alt="itemInSlot(slot.id)?.name ?? ''"
                  :size="44"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.shared-page {
  max-width: 1100px;
}

.shared-header {
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
}

.shared-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.shared-header__title {
  margin: 0 0 8px;
  font-weight: 700;
}

.shared-header__lede,
.shared-header__hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.shared-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.shared-header__hint {
  margin-top: 8px;
}

.shared-board {
  display: grid;
  grid-template-columns: minmax(12rem, 0.4fr) minmax(0, 1fr);
  gap: 1.25rem;
}

.shared-art {
  width: 100%;
  object-fit: contain;
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
  min-width: 7.5rem;
  font-size: 0.92rem;
  font-weight: 500;
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
  background: #152336;
  display: grid;
  place-items: center;
}

.equip-slot--filled {
  border-style: solid;
  border-color: rgba(125, 211, 252, 0.5);
}

@media (max-width: 800px) {
  .shared-board {
    grid-template-columns: 1fr;
  }
}
</style>
