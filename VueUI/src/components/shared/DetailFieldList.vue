<script setup lang="ts">
defineProps<{
  items: { label: string; value: unknown }[];
}>();

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
</script>

<template>
  <v-list>
    <v-list-item v-for="(item, index) in items" :key="index">
      <template #prepend>{{ item.label }}</template>
      <template #append>
        <span class="text-right text-wrap" style="max-width: 28rem">
          {{ display(item.value) }}
        </span>
      </template>
    </v-list-item>
  </v-list>
</template>
