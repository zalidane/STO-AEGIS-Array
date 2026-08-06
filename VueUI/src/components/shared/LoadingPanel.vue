<script setup lang="ts">
defineProps<{ message?: string }>();
</script>

<template>
  <div class="text-center pa-8">
    <v-progress-circular color="primary" size="64" indeterminate />
    <div v-if="message" class="mt-4">Loading {{ message }}...</div>
  </div>
</template>
