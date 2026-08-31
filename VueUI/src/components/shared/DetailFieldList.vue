<script setup lang="ts">
import { cleanTraitDescriptionText } from "@/logic/traitBrowser";

defineProps<{
  items: { label: string; value: unknown }[];
  /** Stretch values across the row and justify wrapping copy. */
  justify?: boolean;
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
  <v-list v-if="justify">
    <v-list-item
      v-for="(item, index) in items"
      :key="index"
      class="detail-field-item"
    >
      <div class="detail-field">
        <div class="detail-field__label">{{ item.label }}</div>
        <p class="detail-field__value">{{ display(item.value) }}</p>
      </div>
    </v-list-item>
  </v-list>
  <v-list v-else>
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

.detail-field-item {
  align-items: flex-start;
}

.detail-field-item :deep(.v-list-item__content) {
  width: 100%;
  overflow: visible;
}

.detail-field {
  display: grid;
  grid-template-columns: minmax(6.5rem, 9rem) minmax(0, 1fr);
  column-gap: 1rem;
  width: 100%;
  align-items: start;
}

.detail-field__label {
  padding-top: 0.1rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail-field__value {
  margin: 0;
  min-width: 0;
  text-align: justify;
  text-align-last: start;
  white-space: pre-line;
  line-height: 1.5;
}
</style>
