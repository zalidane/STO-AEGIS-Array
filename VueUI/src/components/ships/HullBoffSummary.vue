<script setup lang="ts">
import { computed } from "vue";
import { formatHullBoffSummary } from "@/utils/formatters";
import { parseBoffSeats } from "@/mappers/boffColors";

const props = defineProps<{
  /** Raw wiki `boffs` CSV, or already-split seat strings. */
  boffs?: string | null;
}>();

const label = computed(() => {
  const seats = parseBoffSeats(props.boffs).map((seat) => ({
    rank: seat.rank,
    career: seat.careerName,
    specialization: seat.specializationName,
  }));
  return formatHullBoffSummary(seats);
});
</script>

<template>
  <div v-if="label" class="hull-boff-summary" :title="label">
    <span class="hull-boff-summary__plain">{{ label }}</span>
  </div>
</template>

<style scoped>
.hull-boff-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.35;
}

.hull-boff-summary__plain {
  color: rgba(255, 255, 255, 0.72);
}
</style>
