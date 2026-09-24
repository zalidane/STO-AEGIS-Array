<script setup lang="ts">
import { computed } from "vue";
import {
  formatHullConsoleSummary,
  hullConsoleSummaryParts,
  type HullConsoleShip,
} from "@/logic/loadout/consoleSummary";

const props = defineProps<{
  ship: HullConsoleShip;
  /** Plain text (`2 x ENG | …`) instead of themed chips. */
  plain?: boolean;
}>();

const parts = computed(() => hullConsoleSummaryParts(props.ship));
const plainLabel = computed(() => formatHullConsoleSummary(props.ship));
</script>

<template>
  <div
    v-if="parts.length > 0"
    class="hull-console-summary"
    :title="plainLabel"
  >
    <template v-if="plain">
      <span class="hull-console-summary__plain">{{ plainLabel }}</span>
    </template>
    <template v-else>
      <span
        v-for="(part, index) in parts"
        :key="part.label"
        class="hull-console-summary__part"
      >
        <span v-if="index > 0" class="hull-console-summary__sep" aria-hidden="true"
          >|</span
        >
        <span :class="`text-${part.theme}`">
          {{ part.count }} x {{ part.label }}
        </span>
      </span>
    </template>
  </div>
</template>

<style scoped>
.hull-console-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.35;
}

.hull-console-summary__plain {
  color: rgba(255, 255, 255, 0.72);
}

.hull-console-summary__sep {
  margin: 0 0.2rem;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 400;
}
</style>
