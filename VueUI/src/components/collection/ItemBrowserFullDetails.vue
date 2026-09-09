<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { useRouter } from "vue-router";
import {
  InfoboxDocument,
  type InfoboxQuery,
} from "@/graphql/generated/graphql";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import { displayInfoboxType } from "@/logic/collection/itemBrowser";
import { publicUsageLabel } from "@/logic/share/usage";

const props = defineProps<{
  itemId: number;
}>();

const router = useRouter();
const { result, loading, error } = useQuery(InfoboxDocument, () => ({
  id: props.itemId,
}));

type Detail = NonNullable<InfoboxQuery["infobox"]>;
const item = computed<Detail | null>(() => result.value?.infobox ?? null);

const grantingShips = computed(() => {
  if (!item.value) return [];
  const byId = new Map<number, Detail["shipsWithConsole"][number]>();
  for (const ship of [
    ...item.value.shipsWithConsole,
    ...item.value.shipsWithExperimentalWeapon,
  ]) {
    byId.set(ship.id, ship);
  }
  return [...byId.values()];
});

const fields = computed(() => {
  if (!item.value) return [];
  const i = item.value;
  const heads = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [
    { label: `Head ${n}`, value: i[`head${n}` as keyof Detail] },
    { label: `Subhead ${n}`, value: i[`subhead${n}` as keyof Detail] },
    { label: `Text ${n}`, value: i[`text${n}` as keyof Detail] },
  ]);
  return [
    { label: "Rarity", value: i.rarity },
    { label: "Type", value: displayInfoboxType(i.type) },
    { label: "Bound To", value: i.boundto },
    { label: "Bound When", value: i.boundwhen },
    { label: "Who", value: i.who },
    { label: "Equip Limit", value: i.equiplimit },
    ...heads,
    { label: "Created", value: i.createdAt },
    { label: "Updated", value: i.updatedAt },
  ];
});

const usage = computed(() =>
  item.value ? publicUsageLabel(item.value.publicBuildCount) : null,
);
</script>

<template>
  <div class="item-full-details">
    <loading-panel v-if="loading" message="Item details" />
    <v-alert v-else-if="error" type="error" density="compact" class="mb-3">
      {{ error.message }}
    </v-alert>
    <template v-else-if="item">
      <p v-if="usage" class="item-full-details__usage">{{ usage }}</p>

      <section class="item-full-details__section">
        <h3 class="item-full-details__title">Details</h3>
        <DetailFieldList :items="fields" />
      </section>

      <section class="item-full-details__section">
        <h3 class="item-full-details__title">Granted by ships</h3>
        <v-list density="compact" class="item-full-details__list">
          <v-list-item
            v-for="ship in grantingShips"
            :key="ship.id"
            @click="router.push(`/ships/${ship.id}`)"
          >
            <v-list-item-title>{{ ship.name }}</v-list-item-title>
            <v-list-item-subtitle>Tier {{ ship.tier }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!grantingShips.length">
            <v-list-item-title>None</v-list-item-title>
          </v-list-item>
        </v-list>
      </section>

      <section class="item-full-details__section">
        <h3 class="item-full-details__title">Ground Lock Boxes</h3>
        <v-list density="compact" class="item-full-details__list">
          <v-list-item v-for="box in item.gwLockBoxes" :key="box.id">
            <v-list-item-title>{{ box.flavor }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ box.cat }} • {{ box.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.gwLockBoxes.length">
            <v-list-item-title>None</v-list-item-title>
          </v-list-item>
        </v-list>
      </section>

      <section class="item-full-details__section">
        <h3 class="item-full-details__title">Space Lock Boxes</h3>
        <v-list density="compact" class="item-full-details__list">
          <v-list-item v-for="box in item.swLockBoxes" :key="box.id">
            <v-list-item-title>{{ box.flavor }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ box.cat }} • {{ box.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.swLockBoxes.length">
            <v-list-item-title>None</v-list-item-title>
          </v-list-item>
        </v-list>
      </section>
    </template>
  </div>
</template>

<style scoped>
.item-full-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.item-full-details__usage {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.item-full-details__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.item-full-details__title {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.item-full-details__list {
  background: transparent;
  padding: 0;
}
</style>
