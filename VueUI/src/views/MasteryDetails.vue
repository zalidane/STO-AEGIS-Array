<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  MasteryDocument,
  type MasteryQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const router = useRouter();
const id = computed(() => Number(route.params.id));
const { result, loading, error } = useQuery(MasteryDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<MasteryQuery["mastery"]>;
const item = computed<Detail | null>(() => result.value?.mastery ?? null);

const fields = computed(() => {
  if (!item.value) return [];
  const m = item.value;
  return [
    { label: "Mastery Type", value: m.masterytype },
    { label: "Ship Type", value: m.shiptype },
    { label: "Ship Faction", value: m.shipfaction },
    { label: "Mastery Package", value: m.masterypackage },
    { label: "Primary Trait", value: m.trait },
    { label: "Primary Trait Desc", value: m.traitdesc },
    { label: "Secondary Trait", value: m.trait2 },
    { label: "Secondary Trait Desc", value: m.traitdesc2 },
    { label: "Tertiary Trait", value: m.trait3 },
    { label: "Tertiary Trait Desc", value: m.traitdesc3 },
    { label: "Account Trait", value: m.acctrait },
    { label: "Account Trait Desc", value: m.acctraitdesc },
    { label: "Ship Type Id", value: m.shipTypeId },
    { label: "Created", value: m.createdAt },
    { label: "Updated", value: m.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="item?.masterypackage" />
    <loading-panel v-if="loading" :message="'Mastery Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="item">
      <h3>{{ item.masterypackage }}</h3>
      <h5>{{ item.shiptype }} • {{ item.shipfaction }}</h5>

      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>

      <v-card v-if="item.shipType" class="mb-4">
        <v-card-title>Ship Type</v-card-title>
        <v-card-text>
          <a
            href="#"
            @click.prevent="router.push(`/ship-types/${item.shipType!.id}`)"
          >
            {{ item.shipType.name }}
          </a>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title>Linked Starship Traits</v-card-title>
        <v-list>
          <v-list-item
            v-for="linked in [
              item.primaryTrait,
              item.secondaryTrait,
              item.tertiaryTrait,
              item.accountTrait,
            ].filter(Boolean)"
            :key="linked!.id"
            @click="router.push(`/starship-traits/${linked!.id}`)"
          >
            <v-list-item-title>{{ linked!.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ linked!.short }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card>
    </template>
    <v-alert v-else type="warning">Mastery not found</v-alert>
  </v-container>
</template>
