<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { SearchDocument } from "@/graphql/generated/graphql";
import { friendlyNames } from "@/mappers/tableFriendlyNames";
import { typeIcons } from "@/mappers/typeIcons";
import { getSearchResultRoute } from "@/mappers/searchResultRoutes";

const route = useRoute();

const searchText = computed(() => String(route.query.q ?? ""));

const { result, loading, error } = useQuery(SearchDocument, () => ({
  text: searchText.value,
}));

type SearchType = keyof typeof friendlyNames;
const groupedResults = computed(() => {
  const groups: Partial<Record<SearchType, any[]>> = {};

  for (const item of result.value?.search ?? []) {
    const type = item.type as SearchType;
    if (!groups[type]) {
      groups[type] = [];
    }

    if (!groups[type]!.includes(item)) groups[type]!.push(item);
  }
  console.log(groups);
  return groups;
});
</script>

<template>
  <v-container>
    <h1>Search Results</h1>

    <p>
      Results for:
      <strong>{{ searchText }}</strong>
    </p>

    <v-progress-linear v-if="loading" indeterminate />

    <v-alert v-else-if="error" type="error">
      {{ error.message }}
    </v-alert>

    <v-card v-for="(values, key) in groupedResults" :key="key" class="mb-4">
      <v-card-title>
        <v-icon>
          {{ typeIcons[key as keyof typeof typeIcons] }}
        </v-icon>
        {{ friendlyNames[key] ?? [key] }}
        ({{ values?.length }})
      </v-card-title>

      <v-list>
        <v-list-item
          v-for="value in values"
          :key="value.id"
          :to="getSearchResultRoute(value.type, value.id)"
        >
          <v-list-item-title>
            {{ value.name }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>
