<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import TraitDetailCard from "@/components/traits/TraitDetailCard.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import {
  displayTraitEnvironment,
  displayTraitType,
  filterTraitBrowserItems,
  resolveSelectedTrait,
  uniqueTraitFacetValues,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import { toggleInclusiveValue } from "@/logic/shipsBinder";
import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { defaultBindForKind } from "@/logic/collection/bind";
import { useCollectionStore } from "@/stores/collection";
import WikiIcon from "@/components/shared/WikiIcon.vue";

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
  collectBindChoicePrompt?: string | ((item: TraitBrowserItem) => string);
  /** Type and environment chips, matching the ship registry filters. */
  facetFilters?: boolean;
}>();

const collectionStore = useCollectionStore();

const search = ref("");
const selectedId = ref<number | null>(null);
const selectedTypes = ref<string[]>([]);
const selectedEnvironments = ref<string[]>([]);
const hideCollected = ref(false);

const availableTypes = computed(() =>
  uniqueTraitFacetValues(props.items, "type"),
);
const availableEnvironments = computed(() =>
  uniqueTraitFacetValues(props.items, "environment"),
);

const showTypeFilters = computed(
  () => props.facetFilters && availableTypes.value.length > 1,
);
const showEnvironmentFilters = computed(
  () => props.facetFilters && availableEnvironments.value.length > 1,
);
const showHideCollected = computed(() => Boolean(props.collectKind));
const showFilters = computed(
  () =>
    showTypeFilters.value ||
    showEnvironmentFilters.value ||
    showHideCollected.value,
);

const collectedIds = computed(() => {
  if (!props.collectKind) return new Set<number>();
  return collectionStore.ownedCatalogIds(props.collectKind);
});

const filteredItems = computed(() =>
  filterTraitBrowserItems(props.items, search.value, {
    types: selectedTypes.value,
    environments: selectedEnvironments.value,
    hideCollected: hideCollected.value,
    collectedIds: collectedIds.value,
  }),
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

function toggleType(type: string) {
  selectedTypes.value = toggleInclusiveValue(selectedTypes.value, type);
}

function toggleEnvironment(environment: string) {
  selectedEnvironments.value = toggleInclusiveValue(
    selectedEnvironments.value,
    environment,
  );
}

function clearTypeFilters() {
  selectedTypes.value = [];
}

function clearEnvironmentFilters() {
  selectedEnvironments.value = [];
}

function collectBindFor(item: TraitBrowserItem): BindScope {
  if (!props.collectKind) return defaultBindForKind("trait");
  if (typeof props.collectBind === "function") {
    return props.collectBind(item);
  }
  return props.collectBind ?? defaultBindForKind(props.collectKind);
}

function collectAccountUnlockFor(item: TraitBrowserItem): boolean {
  if (!props.collectKind) return false;
  if (typeof props.collectAccountUnlock === "function") {
    return props.collectAccountUnlock(item);
  }
  return Boolean(props.collectAccountUnlock);
}

function collectBindChoicePromptFor(item: TraitBrowserItem): string {
  if (!props.collectKind) return "";
  if (typeof props.collectBindChoicePrompt === "function") {
    return props.collectBindChoicePrompt(item);
  }
  return props.collectBindChoicePrompt ?? "";
}

const selectedCollectBind = computed<BindScope | undefined>(() => {
  if (!props.collectKind || !selected.value) return undefined;
  return collectBindFor(selected.value);
});

const selectedCollectAccountUnlock = computed(() => {
  if (!props.collectKind || !selected.value) return false;
  return collectAccountUnlockFor(selected.value);
});

const selectedCollectBindChoicePrompt = computed(() => {
  if (!props.collectKind || !selected.value) return "";
  return collectBindChoicePromptFor(selected.value);
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
      <section
        v-if="showFilters"
        class="trait-browser__filters"
        aria-label="Trait filters"
      >
        <div class="trait-browser__filters-label">Filter by:</div>
        <div
          v-if="showTypeFilters"
          class="trait-browser__filter-group"
          role="group"
          aria-label="Type"
        >
          <button
            type="button"
            class="trait-browser__chip"
            :class="{ 'trait-browser__chip--active': selectedTypes.length === 0 }"
            @click="clearTypeFilters"
          >
            All types
          </button>
          <button
            v-for="type in availableTypes"
            :key="type"
            type="button"
            class="trait-browser__chip"
            :class="{
              'trait-browser__chip--active': selectedTypes.includes(type),
            }"
            @click="toggleType(type)"
          >
            {{ displayTraitType(type) }}
          </button>
        </div>
        <div
          v-if="showEnvironmentFilters"
          class="trait-browser__filter-group"
          role="group"
          aria-label="Environment"
        >
          <button
            type="button"
            class="trait-browser__chip"
            :class="{
              'trait-browser__chip--active': selectedEnvironments.length === 0,
            }"
            @click="clearEnvironmentFilters"
          >
            All
          </button>
          <button
            v-for="environment in availableEnvironments"
            :key="environment"
            type="button"
            class="trait-browser__chip"
            :class="{
              'trait-browser__chip--active':
                selectedEnvironments.includes(environment),
            }"
            @click="toggleEnvironment(environment)"
          >
            {{ displayTraitEnvironment(environment) }}
          </button>
        </div>
        <div
          v-if="showHideCollected"
          class="trait-browser__filter-group"
          role="group"
          aria-label="Visibility"
        >
          <button
            type="button"
            class="trait-browser__chip"
            :class="{ 'trait-browser__chip--active': hideCollected }"
            @click="hideCollected = !hideCollected"
          >
            Hide collected
          </button>
        </div>
      </section>

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
            No results match the current search and filters.
          </div>

          <div
            v-for="item in filteredItems"
            :key="item.id"
            role="button"
            tabindex="0"
            class="trait-browser__list-item"
            :class="{
              'trait-browser__list-item--active': selected?.id === item.id,
            }"
            @click="selectItem(item.id)"
            @keydown.enter.prevent="selectItem(item.id)"
          >
            <WikiIcon :src="item.imageSrc" :alt="item.name" :size="36" />
            <div class="trait-browser__list-copy">
            <div class="trait-browser__list-name">{{ item.name }}</div>
            <div class="trait-browser__list-desc">
              {{ item.listDescription || "No description available." }}
            </div>
            </div>
            <div
              v-if="collectKind"
              class="trait-browser__list-collect"
              @click.stop
            >
              <CollectToggle
                compact
                :kind="collectKind"
                :catalog-id="item.id"
                :bind="collectBindFor(item)"
                :allow-account-unlock="collectAccountUnlockFor(item)"
                :bind-choice-prompt="collectBindChoicePromptFor(item)"
              />
            </div>
          </div>
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
            :collect-bind-choice-prompt="selectedCollectBindChoicePrompt"
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
.trait-browser__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin-bottom: 1rem;
  padding: 12px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  background: rgba(6, 14, 24, 0.72);
}

.trait-browser__filters-label {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
}

.trait-browser__filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.trait-browser__chip {
  appearance: none;
  border: 1px solid rgba(125, 211, 252, 0.55);
  background: transparent;
  color: #7dd3fc;
  padding: 7px 10px;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  line-height: 1;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.trait-browser__chip:hover {
  background: color-mix(in srgb, #7dd3fc 16%, transparent);
}

.trait-browser__chip--active {
  background: #7dd3fc;
  color: #041018;
  border-color: #7dd3fc;
}

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
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.trait-browser__list-copy {
  min-width: 0;
  flex: 1;
}

.trait-browser__list-collect {
  flex-shrink: 0;
  align-self: center;
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
