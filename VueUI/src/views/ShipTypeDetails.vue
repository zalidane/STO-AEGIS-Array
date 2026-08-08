<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  ShipTypeDocument,
  type ShipTypeQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(ShipTypeDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<ShipTypeQuery["shipType"]>;
const item = computed<Detail | null>(() => result.value?.shipType ?? null);

const fields = computed(() => {
  if (!item.value) return [];
  return [
    { label: "Id", value: item.value.id },
    { label: "Name", value: item.value.name },
    { label: "Ship Count", value: item.value.ships.length },
    { label: "Mastery Count", value: item.value.masteries.length },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.name" />
    <loading-panel v-if="loading" :message="'Ship Type Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <h3>{{ item.name }}</h3>
      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>

      <v-card class="mb-4">
        <v-card-title>Ships</v-card-title>
        <v-list>
          <v-list-item
            v-for="ship in item.ships"
            :key="ship.id"
            @click="router.push(`/ships/${ship.id}`)"
          >
            <v-list-item-title>{{ ship.name }}</v-list-item-title>
            <v-list-item-subtitle>
              Tier {{ ship.tier }} • {{ ship.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.ships.length">None</v-list-item>
        </v-list>
      </v-card>

      <v-card>
        <v-card-title>Masteries</v-card-title>
        <v-list>
          <v-list-item
            v-for="mastery in item.masteries"
            :key="mastery.id"
            @click="router.push(`/masteries/${mastery.id}`)"
          >
            <v-list-item-title>{{ mastery.masterypackage }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ mastery.masterytype }} • {{ mastery.shipfaction }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.masteries.length">None</v-list-item>
        </v-list>
      </v-card>
    </template>
    <v-alert v-else type="warning">Ship type not found</v-alert>
  </v-container>
</template>
