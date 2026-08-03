<script setup lang="ts">
import { gql } from "@apollo/client/core";
import { ref, onMounted } from "vue";
import { apolloClient } from "../apollo";

interface Ship {
  id: number;
  name: string;
  type?: string;
}

const ships = ref<Ship[]>([]);

onMounted(async () => {
  const result = await apolloClient.query({
    query: gql`
      query {
        ships {
          id
          name
          type
        }
      }
    `,
  });

  ships.value = result.data.ships;
});
</script>
<template>
  <v-container>
    <h1 class="mb-4">Ships</h1>

    <v-table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="ship in ships" :key="ship.id">
          <td>{{ ship.name }}</td>
          <td>{{ ship.type }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>
