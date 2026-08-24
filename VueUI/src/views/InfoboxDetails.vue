<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  InfoboxDocument,
  type InfoboxQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import WikiIcon from "@/components/shared/WikiIcon.vue";
import { getItemImageUrl } from "@/utils/wikiImage";
import {
  allowsAccountUnlockFromGrantingShips,
  bindScopeForKind,
} from "@/logic/collection/bind";
import { displayInfoboxType } from "@/logic/collection/itemBrowser";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(InfoboxDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<InfoboxQuery["infobox"]>;
const item = computed<Detail | null>(() => result.value?.infobox ?? null);
const bind = computed(() =>
  bindScopeForKind({
    kind: "item",
    grantingShipCosts:
      item.value?.shipsWithConsole.map((ship) => ship.cost) ?? [],
    boundto: item.value?.boundto,
  }),
);
const allowAccountUnlock = computed(() =>
  allowsAccountUnlockFromGrantingShips(
    item.value?.shipsWithConsole.map((ship) => ship.cost) ?? [],
  ),
);

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
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.name" />
    <loading-panel v-if="loading" :message="'Infobox Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <div class="d-flex align-start justify-space-between ga-4 mb-4">
        <div class="d-flex align-start ga-4">
          <WikiIcon :src="getItemImageUrl(item.image, item.name)" :alt="item.name" :size="64" />
          <div>
            <h3>{{ item.name }}</h3>
            <h5>{{ item.rarity }} • {{ displayInfoboxType(item.type) }}</h5>
          </div>
        </div>
        <CollectToggle
          kind="item"
          :catalog-id="item.id"
          :bind="bind"
          :allow-account-unlock="allowAccountUnlock"
        />
      </div>

      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>

      <v-card class="mb-4">
        <v-card-title>Granted by ships</v-card-title>
        <v-list>
          <v-list-item
            v-for="ship in item.shipsWithConsole"
            :key="ship.id"
            @click="router.push(`/ships/${ship.id}`)"
          >
            <v-list-item-title>{{ ship.name }}</v-list-item-title>
            <v-list-item-subtitle>Tier {{ ship.tier }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.shipsWithConsole.length">None</v-list-item>
        </v-list>
      </v-card>

      <v-card class="mb-4">
        <v-card-title>Ground Lock Boxes</v-card-title>
        <v-list>
          <v-list-item v-for="box in item.gwLockBoxes" :key="box.id">
            <v-list-item-title>{{ box.flavor }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ box.cat }} • {{ box.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.gwLockBoxes.length">None</v-list-item>
        </v-list>
      </v-card>

      <v-card>
        <v-card-title>Space Lock Boxes</v-card-title>
        <v-list>
          <v-list-item v-for="box in item.swLockBoxes" :key="box.id">
            <v-list-item-title>{{ box.flavor }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ box.cat }} • {{ box.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.swLockBoxes.length">None</v-list-item>
        </v-list>
      </v-card>
    </template>
    <v-alert v-else type="warning">Infobox not found</v-alert>
  </v-container>
</template>
