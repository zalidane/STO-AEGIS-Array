<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  SwObtainDocument,
  type SwObtainQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(SwObtainDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<SwObtainQuery["swObtain"]>;
const item = computed<Detail | null>(() => result.value?.swObtain ?? null);

const fields = computed(() => {
  if (!item.value) return [];
  const s = item.value;
  return [
    { label: "Category", value: s.cat },
    { label: "Type", value: s.type },
    { label: "Flavor", value: s.flavor },
    { label: "Box", value: s.box },
    { label: "LB", value: s.lb },
    { label: "Rep", value: s.rep },
    { label: "Ships", value: s.ships },
    { label: "Lock Box Id", value: s.lockBoxId },
    { label: "Created", value: s.createdAt },
    { label: "Updated", value: s.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.flavor" />
    <loading-panel v-if="loading" :message="'Space Obtain Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <h3>{{ item.flavor }}</h3>
      <h5>{{ item.cat }} • {{ item.type }}</h5>
      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
      <v-card v-if="item.lockBox">
        <v-card-title>Lock Box</v-card-title>
        <v-card-text>
          <a
            href="#"
            @click.prevent="router.push(`/infoboxes/${item.lockBox!.id}`)"
          >
            {{ item.lockBox.name }}
          </a>
          — {{ item.lockBox.rarity }} • {{ item.lockBox.type }}
        </v-card-text>
      </v-card>
    </template>
    <v-alert v-else type="warning">Space obtain not found</v-alert>
  </v-container>
</template>
