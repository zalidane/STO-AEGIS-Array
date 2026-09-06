<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import {
  httpErrorPage,
  httpErrorStatusFromRoute,
  type HttpErrorAction,
} from "@/logic/httpErrors";

const route = useRoute();
const page = computed(() =>
  httpErrorPage(
    httpErrorStatusFromRoute({ name: route.name, meta: route.meta }),
  ),
);

function reload() {
  window.location.reload();
}

function actionKey(action: HttpErrorAction): string {
  if (action.kind === "link") return action.to;
  if (action.kind === "external") return action.href;
  return "reload";
}
</script>

<template>
  <v-container class="http-error" fluid>
    <AppBreadcrumbs />

    <header class="http-error__header">
      <p class="http-error__code" aria-hidden="true">{{ page.status }}</p>
      <h1 class="http-error__title">{{ page.title }}</h1>
      <p class="http-error__lede">{{ page.lede }}</p>
    </header>

    <nav class="http-error__actions" aria-label="Error page links">
      <template v-for="action in page.actions" :key="actionKey(action)">
        <v-btn
          v-if="action.kind === 'link'"
          :to="action.to"
          color="primary"
          variant="outlined"
        >
          {{ action.label }}
        </v-btn>
        <v-btn
          v-else-if="action.kind === 'external'"
          :href="action.href"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="outlined"
        >
          {{ action.label }}
        </v-btn>
        <v-btn v-else color="primary" variant="outlined" @click="reload">
          {{ action.label }}
        </v-btn>
      </template>
    </nav>
  </v-container>
</template>

<style scoped>
.http-error {
  max-width: 48rem;
  padding-bottom: 2.5rem;
}

.http-error__header {
  margin: 0.75rem 0 1.5rem;
}

.http-error__code {
  margin: 0 0 0.35rem;
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.http-error__title {
  margin: 0 0 0.55rem;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #e8f1fb;
}

.http-error__lede {
  margin: 0;
  color: rgba(200, 214, 230, 0.78);
  line-height: 1.55;
}

.http-error__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
</style>
