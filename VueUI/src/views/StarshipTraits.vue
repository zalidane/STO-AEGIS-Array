<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  StarshipTraitsDocument,
  type StarshipTraitsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import ObtainedMarkup from "@/components/shared/ObtainedMarkup.vue";
import { useKeepAliveScrollRestore } from "@/composables/useKeepAliveScrollRestore";

defineOptions({ name: "StarshipTraits" });

useKeepAliveScrollRestore();

const router = useRouter();

type StarshipTrait = StarshipTraitsQuery["starshipTraits"][number];

const { result, loading, error } = useQuery(StarshipTraitsDocument);
const traits = computed<StarshipTrait[]>(
  () => result.value?.starshipTraits ?? [],
);
const search = ref("");
const headers = [
  { title: "Name", key: "name", width: "18%" },
  { title: "Type", key: "type", width: "12%" },
  { title: "Short", key: "short", width: "30%" },
  { title: "Obtained", key: "obtained", width: "40%" },
];

function onRowClick(_event: Event, row: { item: StarshipTrait }) {
  router.push(`/starship-traits/${row.item.id}`);
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Starship Traits</h1>

    <loading-panel v-if="loading" :message="'Starship Traits'" />

    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <div v-else>
      <v-text-field v-model="search" label="Search" class="mb-4" />
      <v-data-table
        class="starship-traits-table"
        :items="traits"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        @click:row="onRowClick"
      >
        <template #item.obtained="{ item }">
          <ObtainedMarkup
            :text="item.obtained"
            :ships="item.ships"
            class="obtained-cell"
            @click.stop
          />
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>

<style scoped>
.starship-traits-table {
  width: 100%;
  table-layout: fixed;
}

.obtained-cell {
  max-width: none;
  width: 100%;
  padding: 4px 0;
}
</style>
