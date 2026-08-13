<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  StarshipTraitDocument,
  type StarshipTraitQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import ObtainedMarkup from "@/components/shared/ObtainedMarkup.vue";

const route = useRoute();
const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(StarshipTraitDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<StarshipTraitQuery["starshipTrait"]>;
const trait = computed<Detail | null>(() => result.value?.starshipTrait ?? null);

const fields = computed(() => {
  if (!trait.value) return [];
  const t = trait.value;
  return [
    { label: "Type", value: t.type },
    { label: "Short", value: t.short },
    { label: "Basic", value: t.basic },
    { label: "Detailed", value: t.detailed },
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

      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>

      <v-card v-if="trait.obtained">
        <v-card-title>Obtained</v-card-title>
        <v-card-text>
          <ObtainedMarkup :text="trait.obtained" :ships="trait.ships" />
        </v-card-text>
      </v-card>
    </template>
    <v-alert v-else type="warning">Starship trait not found</v-alert>
  </v-container>
</template>
