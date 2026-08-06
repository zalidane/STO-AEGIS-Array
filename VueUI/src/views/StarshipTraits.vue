<script setup lang="ts">
import { useQuery } from "@vue/apollo-composable";
import { StarshipTraitsDocument } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";

const { result, loading, error } = useQuery(StarshipTraitsDocument);
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Starship Traits</h1>

    <loading-panel v-if="loading" :message="'Starship Traits'" />

    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <v-table v-else>
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="starshipTrait in result?.starshipTraits"
          :key="starshipTrait.id"
        >
          <td>{{ starshipTrait.name }}</td>
          <td>{{ starshipTrait.short }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>
