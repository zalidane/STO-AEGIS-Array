<script setup lang="ts">
import { useQuery } from "@vue/apollo-composable";
import { StarshipTraitsDocument } from "@/graphql/generated/graphql";

const { result, loading, error } = useQuery(StarshipTraitsDocument);
</script>

<template>
  <v-container>
    <h1 class="mb-4">Starship Traits</h1>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
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
