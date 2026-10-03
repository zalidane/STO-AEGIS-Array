<script setup lang="ts">
export type CatalogFacetTab = {
  key: string;
  label: string;
  count: number;
};

defineProps<{
  modelValue: string | null;
  tabs: readonly CatalogFacetTab[];
  ariaLabel: string;
  density?: "default" | "compact";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onUpdate(value: unknown) {
  if (value == null) return;
  emit("update:modelValue", String(value));
}
</script>

<template>
  <div class="catalog-facet-tabs" :aria-label="ariaLabel">
    <v-tabs
      :model-value="modelValue"
      color="primary"
      bg-color="transparent"
      show-arrows
      :density="density === 'compact' ? 'compact' : 'default'"
      @update:model-value="onUpdate"
    >
      <v-tab v-for="tab in tabs" :key="tab.key" :value="tab.key">
        {{ tab.label }}
        <span class="catalog-facet-tabs__count">{{ tab.count }}</span>
      </v-tab>
    </v-tabs>
  </div>
</template>

<style scoped>
.catalog-facet-tabs {
  margin-bottom: 0.35rem;
}

.catalog-facet-tabs__count {
  margin-left: 0.4rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85em;
}
</style>
