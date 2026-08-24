<script setup lang="ts">
import { cleanTraitDescriptionText } from "@/logic/traitBrowser";

defineProps<{
  items: { label: string; value: unknown }[];
}>();

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    return cleanTraitDescriptionText(value) ?? "—";
  }
  return String(value);
}
</script>

<template>
  <v-list>
    <v-list-item v-for="(item, index) in items" :key="index">
      <template #prepend>{{ item.label }}</template>
      <template #append>
        <span class="detail-field-value">
          {{ display(item.value) }}
        </span>
      </template>
    </v-list-item>
  </v-list>
</template>

<style scoped>
.detail-field-value {
  display: block;
  max-width: 28rem;
  text-align: right;
  white-space: pre-wrap;
}
</style>
