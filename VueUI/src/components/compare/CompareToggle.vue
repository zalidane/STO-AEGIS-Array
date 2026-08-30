<script setup lang="ts">
import { computed } from "vue";
import { useCompareStore } from "@/stores/compare";

const props = defineProps<{
  shipId: number;
  compact?: boolean;
}>();

const compare = useCompareStore();
const selected = computed(() => compare.selected(props.shipId));
const label = computed(() => compare.labelFor(props.shipId));

function onClick(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  compare.toggle(props.shipId);
}
</script>

<template>
  <v-btn
    :icon="compact"
    :size="compact ? 'x-small' : 'small'"
    :variant="selected ? 'flat' : 'outlined'"
    :color="selected ? 'primary' : 'default'"
    :aria-pressed="selected"
    :aria-label="label"
    :title="label"
    :prepend-icon="compact ? undefined : 'mdi-compare-horizontal'"
    @click="onClick"
  >
    <v-icon v-if="compact" size="16" icon="mdi-compare-horizontal" />
    <span v-else>{{ selected ? "Selected" : "Compare" }}</span>
  </v-btn>
</template>
