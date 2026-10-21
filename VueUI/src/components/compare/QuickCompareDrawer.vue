<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import { ShipsDocument, type ShipsQuery } from "@/graphql/generated/graphql";
import CompareColumns from "@/components/compare/CompareColumns.vue";
import { useCompareStore } from "@/stores/compare";
import { buildMultiCompareSections } from "@/logic/compare/multi";
import type { CompareHull } from "@/logic/compare/rows";
import { quickCompareHullIds } from "@/logic/compare/selection";

const open = defineModel<boolean>({ required: true });

const props = defineProps<{
  ship: CompareHull;
}>();

const compare = useCompareStore();
const { ids, ready, path } = storeToRefs(compare);

const { result, loading, error } = useQuery(ShipsDocument);

type Ship = ShipsQuery["ships"][number];

const catalog = computed<Ship[]>(() => result.value?.ships ?? []);

const columnHulls = computed(() => {
  const byId = new Map(catalog.value.map((row) => [row.id, row]));
  const ordered = quickCompareHullIds(props.ship.id, ids.value);
  return ordered
    .map((id) => (id === props.ship.id ? props.ship : byId.get(id)))
    .filter((row): row is CompareHull => row != null);
});

const missingIds = computed(() => {
  const shown = new Set(columnHulls.value.map((row) => row.id));
  return quickCompareHullIds(props.ship.id, ids.value).filter(
    (id) => !shown.has(id),
  );
});

const sections = computed(() =>
  columnHulls.value.length >= 2
    ? buildMultiCompareSections(columnHulls.value)
    : [],
);

function close() {
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div class="quick-compare">
      <button
        type="button"
        class="quick-compare__scrim"
        aria-label="Close comparison"
        @click="close"
      />
      <aside
        class="quick-compare__drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-compare-title"
      >
        <header class="quick-compare__header">
          <div>
            <div class="quick-compare__eyebrow">Ship details // Compare</div>
            <h2 id="quick-compare-title" class="quick-compare__title">
              Quick compare
            </h2>
            <p class="quick-compare__lede">
              {{ ship.name }} against the hulls already selected. Closing this
              panel keeps that selection.
            </p>
          </div>
          <div class="quick-compare__actions">
            <v-btn
              v-if="ready"
              :to="path"
              size="small"
              variant="text"
              prepend-icon="mdi-open-in-new"
            >
              Full compare
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              prepend-icon="mdi-close"
              @click="close"
            >
              Close
            </v-btn>
          </div>
        </header>

        <div class="quick-compare__body">
          <p v-if="loading" class="quick-compare__hint">Loading hulls…</p>
          <v-alert v-else-if="error" type="error" class="mb-4">
            {{ error.message }}
          </v-alert>
          <template v-else>
            <p v-if="columnHulls.length < 2" class="quick-compare__hint">
              Select another hull with Compare. This panel stays on the ship
              page, and closing it does not clear the selection.
            </p>
            <CompareColumns
              :hulls="columnHulls"
              :sections="sections"
              @remove="compare.remove"
            />
            <p v-for="id in missingIds" :key="id" class="quick-compare__missing">
              Hull #{{ id }} is not in the catalog.
            </p>
          </template>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.quick-compare {
  position: fixed;
  inset: 0;
  z-index: 2400;
  display: flex;
  justify-content: flex-end;
}

.quick-compare__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(6, 12, 22, 0.28);
  cursor: pointer;
}

.quick-compare__drawer {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(40rem, 58vw);
  max-width: 100%;
  height: 100%;
  overflow: auto;
  background: rgba(18, 32, 55, 0.85);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.35);
}

.quick-compare__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.1rem 0.9rem;
  background: rgba(18, 32, 55, 0.92);
  border-bottom: 1px solid rgba(125, 211, 252, 0.35);
}

.quick-compare__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.quick-compare__title {
  margin: 0 0 6px;
  font-size: 1.25rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.quick-compare__lede {
  margin: 0;
  max-width: 36rem;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.92rem;
}

.quick-compare__actions {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.quick-compare__body {
  padding: 1rem 1.1rem 1.5rem;
}

.quick-compare__hint {
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.quick-compare__missing {
  color: rgba(255, 180, 120, 0.9);
}

@media (max-width: 720px) {
  .quick-compare__drawer {
    width: 100%;
  }
}
</style>
