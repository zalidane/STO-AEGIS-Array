<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  StarshipTraitDocument,
  type StarshipTraitQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import ObtainedMarkup from "@/components/shared/ObtainedMarkup.vue";
import { resolveFactionThemeColor } from "@/logic/resolvePrimaryFaction";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(StarshipTraitDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<StarshipTraitQuery["starshipTrait"]>;
const trait = computed<Detail | null>(() => result.value?.starshipTrait ?? null);

function shipNameClass(ship: Detail["ships"][number]): string {
  return `text-${resolveFactionThemeColor(ship)}`;
}

const fields = computed(() => {
  if (!trait.value) return [];
  const t = trait.value;
  return [
    { label: "Type", value: t.type },
    { label: "Short", value: t.short },
    { label: "Basic", value: t.basic },
    { label: "Detailed", value: t.detailed },
    { label: "Icon Name", value: t.iconName },
    { label: "Tag", value: t.tag },
    { label: "Tag 2", value: t.tag2 },
    { label: "Tag 3", value: t.tag3 },
    { label: "Created", value: t.createdAt },
    { label: "Updated", value: t.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="trait?.name" />
    <loading-panel v-if="loading" :message="'Starship Trait Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="trait">
      <h3>{{ trait.name }}</h3>
      <h5>{{ trait.type }}</h5>

      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>

      <v-card class="mb-4">
        <v-card-title>Obtained</v-card-title>
        <v-card-text>
          <ObtainedMarkup :text="trait.obtained" :ships="trait.ships" />
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title>Ships</v-card-title>
        <v-list>
          <v-list-item
            v-for="ship in trait.ships"
            :key="ship.id"
            @click="router.push(`/ships/${ship.id}`)"
          >
            <v-list-item-title :class="shipNameClass(ship)">{{
              ship.name
            }}</v-list-item-title>
            <v-list-item-subtitle>
              Tier {{ ship.tier }} • {{ ship.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!trait.ships.length">None</v-list-item>
        </v-list>
      </v-card>
    </template>
    <v-alert v-else type="warning">Starship trait not found</v-alert>
  </v-container>
</template>
