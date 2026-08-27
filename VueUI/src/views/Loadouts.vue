<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import { ShipsDocument } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import { useCollectionStore } from "@/stores/collection";
import { buildHullSlots } from "@/logic/loadout/hullSlots";
import { loadoutsForCharacter } from "@/logic/loadout/state";
import { getShipImageUrl } from "@/utils/shipImage";

const store = useCollectionStore();
const { activeCharacter, state } = storeToRefs(store);
const { result } = useQuery(ShipsDocument);

const loadouts = computed(() =>
  loadoutsForCharacter(state.value, state.value.activeCharacterId),
);

const shipsById = computed(() => {
  const map = new Map((result.value?.ships ?? []).map((ship) => [ship.id, ship]));
  return map;
});

const rows = computed(() =>
  loadouts.value.map((loadout) => {
    const ship = shipsById.value.get(loadout.shipId);
    const total = ship ? buildHullSlots(ship).length : 0;
    return {
      loadout,
      shipName: ship?.name ?? `Ship #${loadout.shipId}`,
      image: getShipImageUrl(ship?.image),
      filled: loadout.slots.length,
      total,
      to: `/ships/${loadout.shipId}/loadout?loadout=${loadout.id}`,
    };
  }),
);
</script>

<template>
  <app-breadcrumbs />
  <v-container class="loadout-page" fluid>
    <header class="loadout-header">
      <div class="loadout-header__eyebrow">STO-AEGIS Array // Loadouts</div>
      <h1 class="loadout-header__title">Loadouts</h1>
      <p class="loadout-header__lede">
        {{
          activeCharacter
            ? `Saved hull loadouts for ${activeCharacter.name}. Equip from the collection into legal slots.`
            : "Create a captain, then open a ship and start a loadout."
        }}
      </p>
    </header>

    <div v-if="!activeCharacter" class="empty-featured">
      No captain selected.
    </div>
    <div v-else-if="rows.length === 0" class="empty-featured">
      No loadouts yet. Open a ship and choose Loadout.
    </div>
    <div v-else class="loadout-list">
      <RouterLink
        v-for="row in rows"
        :key="row.loadout.id"
        :to="row.to"
        class="loadout-row"
      >
        <img v-if="row.image" :src="row.image" :alt="row.shipName" class="loadout-row__art" />
        <div>
          <div class="loadout-row__name">{{ row.loadout.name }}</div>
          <div class="loadout-row__meta">
            {{ row.shipName }}
            <span v-if="row.total > 0">
              · {{ row.filled }}/{{ row.total }} slots seated
            </span>
          </div>
        </div>
      </RouterLink>
    </div>
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
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.loadout-header__lede {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.empty-featured {
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

.loadout-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.loadout-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 1rem;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #101b2a;
}

.loadout-row__art {
  width: 88px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.loadout-row__name {
  font-weight: 700;
}

.loadout-row__meta {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.86rem;
}
</style>
