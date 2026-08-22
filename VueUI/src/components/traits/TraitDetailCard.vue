<script setup lang="ts">
import { computed } from "vue";
import ObtainedMarkup from "@/components/shared/ObtainedMarkup.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import {
  traitBrowserMetaChips,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { defaultBindForKind } from "@/logic/collection/bind";

const props = defineProps<{
  item: TraitBrowserItem;
  sourceLabel?: string;
  descriptionLabel?: string;
  detailsPath?: (id: number) => string;
  /** Home featured cards: clamp copy and skip obtained markup. */
  compact?: boolean;
  collectKind?: CatalogKind;
  collectBind?: BindScope;
  collectAccountUnlock?: boolean;
}>();

const resolvedSourceLabel = computed(() => props.sourceLabel ?? "Source");
const resolvedDescriptionLabel = computed(
  () => props.descriptionLabel ?? "Description",
);
const metaChips = computed(() => traitBrowserMetaChips(props.item));
const description = computed(() =>
  props.compact
    ? (props.item.listDescription ?? props.item.detailDescription)
    : props.item.detailDescription,
);
const showSource = computed(
  () => !props.compact && Boolean(props.item.source?.trim()),
);
const resolvedBind = computed(
  () => props.collectBind ?? defaultBindForKind(props.collectKind ?? "trait"),
);
</script>

<template>
  <article
    class="trait-browser__card"
    :class="{ 'trait-browser__card--compact': compact }"
  >
    <header class="trait-browser__card-header">
      <div>
        <h2 class="trait-browser__card-title">{{ item.name }}</h2>
        <div v-if="metaChips.length" class="trait-browser__meta">
          <v-chip
            v-for="chip in metaChips"
            :key="chip.label"
            size="small"
            variant="tonal"
            color="primary"
          >
            <span class="trait-browser__meta-label">{{ chip.label }}:</span>
            {{ chip.value }}
          </v-chip>
        </div>
      </div>

      <div class="trait-browser__card-actions">
        <CollectToggle
          v-if="collectKind"
          :kind="collectKind"
          :catalog-id="item.id"
          :bind="resolvedBind"
          :allow-account-unlock="collectAccountUnlock"
        />
        <v-btn
          v-if="detailsPath"
          :to="detailsPath(item.id)"
          variant="outlined"
          color="primary"
          size="small"
        >
          Full details
        </v-btn>
      </div>
    </header>

    <div class="trait-browser__card-body">
      <section v-if="showSource" class="trait-browser__section">
        <h3 class="trait-browser__section-title">
          {{ resolvedSourceLabel }}
        </h3>
        <ObtainedMarkup :text="item.source" :ships="item.ships" />
      </section>

      <section v-if="description?.trim()" class="trait-browser__section">
        <h3 class="trait-browser__section-title">
          {{ resolvedDescriptionLabel }}
        </h3>
        <p class="trait-browser__detail-text">
          {{ description }}
        </p>
      </section>

      <p
        v-if="!showSource && !description?.trim()"
        class="trait-browser__empty"
      >
        No additional details available.
      </p>
    </div>
  </article>
</template>

<style scoped>
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

.trait-browser__card--compact {
  max-height: 22rem;
}

.trait-browser__card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.trait-browser__card-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
}

.trait-browser__card-title {
  margin: 0 0 0.55rem;
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 700;
}

.trait-browser__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.trait-browser__meta-label {
  opacity: 0.75;
  margin-right: 0.25rem;
}

.trait-browser__card-body {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.trait-browser__section-title {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 650;
}

.trait-browser__detail-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
}

.trait-browser__card--compact .trait-browser__detail-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  overflow: hidden;
  white-space: normal;
}

.trait-browser__empty {
  color: rgba(255, 255, 255, 0.55);
  padding: 0.75rem;
}

@media (max-width: 960px) {
  .trait-browser__card {
    max-height: none;
  }
}
</style>
