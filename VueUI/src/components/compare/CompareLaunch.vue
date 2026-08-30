<script setup lang="ts">
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useCompareStore } from "@/stores/compare";

const router = useRouter();
const compare = useCompareStore();
const { count, ready, path } = storeToRefs(compare);

function launch() {
  if (!ready.value) return;
  void router.push(path.value);
}
</script>

<template>
  <div v-if="count > 0" class="compare-launch">
    <v-btn
      color="primary"
      variant="outlined"
      size="small"
      prepend-icon="mdi-compare-horizontal"
      :disabled="!ready"
      :aria-disabled="!ready"
      @click="launch"
    >
      Compare hulls
      <span class="compare-launch__count">{{ count }}/2</span>
    </v-btn>
    <v-btn
      v-if="count > 0"
      size="small"
      variant="text"
      @click="compare.clear()"
    >
      Clear
    </v-btn>
  </div>
</template>

<style scoped>
.compare-launch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.compare-launch__count {
  margin-left: 0.35rem;
  opacity: 0.75;
}
</style>
