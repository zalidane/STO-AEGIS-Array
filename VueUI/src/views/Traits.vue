<script setup lang="ts">
import { useQuery } from "@vue/apollo-composable";
import { TraitsDocument } from "@/graphql/generated/graphql";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";

const { result, loading, error } = useQuery(TraitsDocument);

const spaceTraits =
  result.value?.traits.filter((trait) => trait.environment === "space") ?? [];
const groundTraits =
  result.value?.traits.filter((trait) => trait.environment === "ground") ?? [];
</script>

<template>
  <app-breadcrumbs />
  <v-container>
    <h1 class="mb-4">Traits</h1>

    <loading-panel v-if="loading" :message="'Traits'" />

    <v-alert v-else-if="error" type="error" class="mb-4">
      {{ error.message }}
    </v-alert>

    <div v-else>
      <v-table>
        <thead>
          <tr>
            <th colspan="2">Space Traits</th>
          </tr>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="trait in spaceTraits" :key="trait.id">
            <td>{{ trait.name }}</td>
            <td>{{ trait.description }}</td>
          </tr>
        </tbody>
      </v-table>

      <hr />

      <v-table>
        <thead>
          <tr>
            <th colspan="2">Ground Traits</th>
          </tr>
          <tr>
            <th>Name</th>
            <th>Description</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="trait in groundTraits" :key="trait.id">
            <td>{{ trait.name }}</td>
            <td>{{ trait.description }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </v-container>
</template>
