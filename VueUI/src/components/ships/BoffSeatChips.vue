<script setup lang="ts">
import type { BoffSeatView } from "@/mappers/boffColors";

defineProps<{
  seats: readonly BoffSeatView[];
  /** Smaller chips for dense list rows. */
  dense?: boolean;
}>();
</script>

<template>
  <div class="boff-seat-chips" :class="{ 'boff-seat-chips--dense': dense }">
    <v-chip
      v-for="seat in seats"
      :key="seat.raw"
      :size="dense ? 'x-small' : 'small'"
      variant="outlined"
      :color="seat.career"
      class="font-weight-bold justify-center boff-chip"
      :class="{ 'boff-chip--hybrid': !!seat.specialization }"
      :style="
        seat.specialization
          ? {
              '--boff-career': `rgb(var(--v-theme-${seat.career}))`,
              '--boff-spec': `rgb(var(--v-theme-${seat.specialization}))`,
            }
          : undefined
      "
    >
      <span>{{ seat.careerLabel }}</span>
      <span
        v-if="seat.specializationLabel"
        :class="seat.specialization ? `text-${seat.specialization}` : undefined"
      >
        -{{ seat.specializationLabel }}
      </span>
    </v-chip>
  </div>
</template>

<style scoped>
.boff-seat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.boff-seat-chips--dense {
  gap: 0.25rem;
}

.boff-chip {
  min-width: 72px;
}

.boff-seat-chips--dense .boff-chip {
  min-width: 0;
}

.boff-chip--hybrid {
  box-shadow:
    inset 3px 0 0 var(--boff-career),
    inset -3px 0 0 var(--boff-spec);
}
</style>
