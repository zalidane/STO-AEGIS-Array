<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import TraitDetailCard from "@/components/traits/TraitDetailCard.vue";
import {
  filterTraitBrowserItems,
  resolveSelectedTrait,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { defaultBindForKind } from "@/logic/collection/bind";

const props = defineProps<{
  title: string;
  items: readonly TraitBrowserItem[];
  loading?: boolean;
  errorMessage?: string | null;
  sourceLabel?: string;
  descriptionLabel?: string;
  /** Optional deep-link path builder for full detail pages. */
  detailsPath?: (id: number) => string;
  collectKind?: CatalogKind;
  collectBind?: BindScope | ((item: TraitBrowserItem) => BindScope);
  collectAccountUnlock?: boolean | ((item: TraitBrowserItem) => boolean);
}>();

const search = ref("");
const selectedId = ref<number | null>(null);

const filteredItems = computed(() =>
  filterTraitBrowserItems(props.items, search.value),
);

const selected = computed(() =>
  resolveSelectedTrait(filteredItems.value, selectedId.value),
);

watch(
  filteredItems,
  (items) => {
    if (items.length === 0) {
      selectedId.value = null;
      return;
    }
    if (
      selectedId.value == null ||
      !items.some((item) => item.id === selectedId.value)
    ) {
      selectedId.value = items[0]!.id;
    }
  },
  { immediate: true },
);

function selectItem(id: number) {
  selectedId.value = id;
}

const selectedCollectBind = computed<BindScope | undefined>(() => {
  if (!props.collectKind || !selected.value) return undefined;
  if (typeof props.collectBind === "function") {
    return props.collectBind(selected.value);
  }
  return props.collectBind ?? defaultBindForKind(props.collectKind);
});

const selectedCollectAccountUnlock = computed(() => {
  if (!props.collectKind || !selected.value) return false;
  if (typeof props.collectAccountUnlock === "function") {
    return props.collectAccountUnlock(selected.value);
  }
  return Boolean(props.collectAccountUnlock);
});
</script>

<template>
  <div class="trait-browser">
    <h1 class="mb-4">{{ title }}</h1>

    <loading-panel v-if="loading" :message="title" />

    <v-alert v-else-if="errorMessage" type="error" class="mb-4">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <v-text-field
        v-model="search"
        label="Search"
        class="mb-4"
        hide-details
        clearable
      />

      <div class="trait-browser__layout">
        <aside class="trait-browser__list-pane">
          <div v-if="filteredItems.length === 0" class="trait-browser__empty">
            No results match your search.
          </div>

          <button
            v-for="item in filteredItems"
            :key="item.id"
            type="button"
            class="trait-browser__list-item"
            :class="{
              'trait-browser__list-item--active': selected?.id === item.id,
            }"
            @click="selectItem(item.id)"
          >
            <div class="trait-browser__list-name">{{ item.name }}</div>
            <div class="trait-browser__list-desc">
              {{ item.listDescription || "No description available." }}
            </div>
          </button>
        </aside>

        <section class="trait-browser__card-pane">
          <TraitDetailCard
            v-if="selected"
            :item="selected"
            :source-label="sourceLabel"
            :description-label="descriptionLabel"
            :details-path="detailsPath"
            :collect-kind="collectKind"
            :collect-bind="selectedCollectBind"
            :collect-account-unlock="selectedCollectAccountUnlock"
          />

          <div v-else class="trait-browser__empty trait-browser__card">
            Select an item to view details.
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.trait-browser__layout {
  display: grid;
  grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
  min-height: min(70vh, 52rem);
}

.trait-browser__list-pane {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
  max-height: min(70vh, 52rem);
  overflow: auto;
  padding-right: 0.25rem;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.trait-browser__list-item {
  appearance: none;
  border: 1px solid transparent;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(13, 22, 36, 0.72);
  color: inherit;
  text-align: left;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.trait-browser__list-item:hover,
.trait-browser__list-item:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.45);
  outline: none;
}

.trait-browser__list-item--active {
  border-color: rgb(var(--v-theme-primary));
  background:
    linear-gradient(
      180deg,
      rgba(var(--v-theme-primary), 0.16),
      rgba(13, 22, 36, 0.85)
    );
}

.trait-browser__list-name {
  font-weight: 650;
  line-height: 1.25;
  margin-bottom: 0.25rem;
}

.trait-browser__list-desc {
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.86rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.trait-browser__card-pane {
  min-width: 0;
  min-height: 0;
}

.trait-browser__card {
  height: 100%;
  max-height: min(70vh, 52rem);
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.04), transparent 40%),
    linear-gradient(160deg, #152336, #0d1624 70%, #0a121d);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  padding: 1.15rem 1.25rem 1.35rem;
}

.trait-browser__empty {
  color: rgba(255, 255, 255, 0.55);
  padding: 0.75rem;
}

@media (max-width: 960px) {
  .trait-browser__layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .trait-browser__list-pane {
    max-height: 40vh;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 0.75rem;
  }

  .trait-browser__card {
    max-height: none;
  }
}
</style>
