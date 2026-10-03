<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  ReputationsDocument,
  type ReputationsQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import CatalogFacetTabs from "@/components/shared/CatalogFacetTabs.vue";
import {
  REPUTATION_BROWSER_TITLE,
  filterReputationCatalog,
  reputationTabEmptyMessage,
  type ReputationCatalogKind,
} from "@/logic/reputationCatalog";

const router = useRouter();
type Reputation = ReputationsQuery["reputations"][number];

const { result, loading, error } = useQuery(ReputationsDocument);
const items = computed<Reputation[]>(() => result.value?.reputations ?? []);
const search = ref("");
const activeKind = ref<ReputationCatalogKind>("reputation");
const headers = [
  { title: "Name", key: "name" },
  { title: "Environment", key: "environment" },
  { title: "Released", key: "released" },
  { title: "BOff", key: "boff" },
  { title: "Secondary", key: "secondary" },
  { title: "Link", key: "link" },
];

const kindTabs = computed(() => {
  const kinds: ReputationCatalogKind[] = ["reputation", "specialization"];
  return kinds.map((kind) => ({
    key: kind,
    label: kind === "reputation" ? "Reputations" : "Specializations",
    count: filterReputationCatalog(items.value, kind).length,
  }));
});

const visibleItems = computed(() =>
  filterReputationCatalog(items.value, activeKind.value),
);

const emptyMessage = computed(() =>
  reputationTabEmptyMessage(activeKind.value),
);

function onRowClick(_event: Event, row: { item: Reputation }) {
  router.push(`/reputations/${row.item.id}`);
}

function selectKind(kind: string) {
  if (kind === "reputation" || kind === "specialization") {
    activeKind.value = kind;
  }
}
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">{{ REPUTATION_BROWSER_TITLE }}</h1>
    <loading-panel v-if="loading" :message="REPUTATION_BROWSER_TITLE" />
    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>
    <div v-else>
      <CatalogFacetTabs
        :model-value="activeKind"
        :tabs="kindTabs"
        ariaLabel="Reputations and specializations"
        @update:model-value="selectKind"
      />
      <v-text-field v-model="search" label="Search" class="mb-4" />
      <p v-if="visibleItems.length === 0" class="reputation-empty">
        {{ emptyMessage }}
      </p>
      <v-data-table
        v-else
        :items="visibleItems"
        :search="search"
        :headers="headers"
        :items-per-page="25"
        no-data-text="No results match the current search."
        @click:row="onRowClick"
      />
    </div>
  </v-container>
</template>

<style scoped>
.reputation-empty {
  margin: 0;
  color: rgba(255, 255, 255, 0.55);
  padding: 0.75rem;
}
</style>
