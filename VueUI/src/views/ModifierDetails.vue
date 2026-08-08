<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  ModifierDocument,
  type ModifierQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(ModifierDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<ModifierQuery["modifier"]>;
const item = computed<Detail | null>(() => result.value?.modifier ?? null);

const fields = computed(() => {
  if (!item.value) return [];
  const m = item.value;
  return [
    { label: "Type", value: m.type },
    { label: "Stats", value: m.stats },
    { label: "Available", value: m.available },
    { label: "Unique", value: m.isunique },
    { label: "Epic", value: m.isepic },
    { label: "Info", value: m.info },
    { label: "Created", value: m.createdAt },
    { label: "Updated", value: m.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.modifier" />
    <loading-panel v-if="loading" :message="'Modifier Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <h3>{{ item.modifier }}</h3>
      <h5>{{ item.type }}</h5>
      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
      <v-card>
        <v-card-title>Items</v-card-title>
        <v-list>
          <v-list-item
            v-for="infobox in item.items"
            :key="infobox.id"
            @click="router.push(`/infoboxes/${infobox.id}`)"
          >
            <v-list-item-title>{{ infobox.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ infobox.rarity }} • {{ infobox.type }}
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="!item.items.length">None</v-list-item>
        </v-list>
      </v-card>
    </template>
    <v-alert v-else type="warning">Modifier not found</v-alert>
  </v-container>
</template>
