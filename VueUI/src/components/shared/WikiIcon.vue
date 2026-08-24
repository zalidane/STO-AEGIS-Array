<script setup lang="ts">
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt: string;
    size?: number;
  }>(),
  { size: 40 },
);

const failed = ref(false);

watch(
  () => props.src,
  () => {
    failed.value = false;
  },
);
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt"
    class="wiki-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @error="failed = true"
  />
</template>

<style scoped>
.wiki-icon {
  display: block;
  object-fit: contain;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
}
</style>
