<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  ReputationDocument,
  type ReputationQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import {
  REPUTATION_BROWSER_TITLE,
  reputationKindLabel,
} from "@/logic/reputationCatalog";

const route = useRoute();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(ReputationDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<ReputationQuery["reputation"]>;
const item = computed<Detail | null>(() => result.value?.reputation ?? null);

const fields = computed(() => {
  if (!item.value) return [];
  const r = item.value;
  return [
    { label: "Description", value: r.description },
    { label: "Environment", value: r.environment },
    { label: "Released", value: r.released },
    { label: "Link", value: r.link },
    { label: "Icon", value: r.icon },
    { label: "Color 1", value: r.color1 },
    { label: "Color 2", value: r.color2 },
    { label: "BOff", value: r.boff },
    { label: "Secondary", value: r.secondary },
    { label: "Created", value: r.createdAt },
    { label: "Updated", value: r.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.name" />
    <loading-panel v-if="loading" :message="REPUTATION_BROWSER_TITLE" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <p class="reputation-kind">{{ reputationKindLabel(item.environment) }}</p>
      <h3>{{ item.name }}</h3>
      <v-card class="mt-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
    </template>
    <v-alert v-else type="warning">
      Not found in {{ REPUTATION_BROWSER_TITLE }}.
    </v-alert>
  </v-container>
</template>

<style scoped>
.reputation-kind {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 650;
}
</style>
