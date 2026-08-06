<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { buildBreadcrumbs } from "@/logic/buildBreadcrumbs";

const props = defineProps<{
  title?: string;
}>();

const route = useRoute();
const router = useRouter();

const breadcrumbs = computed(() =>
  buildBreadcrumbs({
    path: route.path,
    matched: route.matched,
    routes: router.getRoutes(),
    title: props.title,
  }),
);
</script>

<template>
  <v-breadcrumbs :items="breadcrumbs" divider=">" />
</template>
