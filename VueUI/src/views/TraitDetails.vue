<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  TraitByIdDocument,
  type TraitByIdQuery,
} from "@/graphql/documents/traitById";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";

const route = useRoute();
const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(TraitByIdDocument, () => ({
  id: id.value,
}));

type TraitDetail = NonNullable<TraitByIdQuery["traitById"]>;
const trait = computed<TraitDetail | null>(
  () => result.value?.traitById ?? null,
);

const fields = computed(() => {
  if (!trait.value) return [];
  const t = trait.value;
  return [
    { label: "Type", value: t.type },
    { label: "Environment", value: t.environment },
    { label: "Short Description", value: t.shortDescription },
    { label: "Description", value: t.description },
    { label: "Required", value: t.required },
    { label: "Possible", value: t.possible },
    { label: "Career", value: t.career },
    { label: "Source", value: t.source },
    { label: "Char Variant", value: t.charVariant },
    { label: "BOff Variant", value: t.boffVariant },
    { label: "DOff Variant", value: t.doffVariant },
    { label: "Icon Name", value: t.iconName },
    { label: "Master", value: t.master },
    { label: "Created", value: t.createdAt },
    { label: "Updated", value: t.updatedAt },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="trait?.name" />
    <loading-panel v-if="loading" :message="'Trait Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="trait">
      <h3>{{ trait.name }}</h3>
      <h5>{{ trait.type }} • {{ trait.environment }}</h5>
      <v-card class="mt-4">
        <v-card-title>Trait Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>
    </template>
    <v-alert v-else type="warning">Trait not found</v-alert>
  </v-container>
</template>
