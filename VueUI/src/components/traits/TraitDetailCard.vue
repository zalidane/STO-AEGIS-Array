<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ObtainedMarkup from "@/components/shared/ObtainedMarkup.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import {
  traitBrowserMetaChips,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { defaultBindForKind } from "@/logic/collection/bind";
import {
  TRAIT_ICON_FEATURED_HEIGHT,
  TRAIT_ICON_FEATURED_WIDTH,
  resolveTraitArtSrc,
} from "@/utils/traitImage";
import WikiIcon from "@/components/shared/WikiIcon.vue";

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
  collectBindChoicePrompt?: string;
  /** Compact featured cards: placeholder if `item.imageSrc` is missing or fails. */
  artSrc?: string | null;
}>();

const artFailed = ref(false);

watch(
  () => [props.item.imageSrc, props.artSrc],
  () => {
    artFailed.value = false;
  },
);

const resolvedArtSrc = computed(() =>
  resolveTraitArtSrc(props.item.imageSrc, props.artSrc, artFailed.value),
);
const showingPlaceholder = computed(() => {
  const icon = props.item.imageSrc?.trim();
  return !icon || artFailed.value;
});
const featuredIconStyle = {
  width: `${TRAIT_ICON_FEATURED_WIDTH}px`,
  height: `${TRAIT_ICON_FEATURED_HEIGHT}px`,
};

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
const textBlocks = computed(() =>
  props.compact ? [] : (props.item.textBlocks ?? []),
);
const showTextBlocks = computed(() => textBlocks.value.length > 0);
const showDescription = computed(
  () => !showTextBlocks.value && Boolean(description.value?.trim()),
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
    :class="{
      'trait-browser__card--compact': compact,
      'trait-browser__card--with-art': compact && resolvedArtSrc,
    }"
  >
    <div
      v-if="compact && resolvedArtSrc"
      class="trait-browser__art"
      :class="{ 'trait-browser__art--placeholder': showingPlaceholder }"
    >
      <v-img
        v-if="showingPlaceholder"
        :src="resolvedArtSrc"
        :alt="item.name"
        cover
        class="trait-browser__art-image"
        @error="artFailed = true"
      />
      <img
        v-else
        :src="resolvedArtSrc"
        :alt="item.name"
        class="trait-browser__art-icon"
        :style="featuredIconStyle"
        @error="artFailed = true"
      />
    </div>

    <div class="trait-browser__content">
      <header class="trait-browser__card-header">
      <div class="trait-browser__card-title-row">
        <WikiIcon
          v-if="!compact"
          :src="item.imageSrc"
          :alt="item.name"
          :size="56"
        />
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
      </div>

      <div class="trait-browser__card-actions">
        <CollectToggle
          v-if="collectKind"
          :compact="compact"
          :kind="collectKind"
          :catalog-id="item.id"
          :bind="resolvedBind"
          :allow-account-unlock="collectAccountUnlock"
          :bind-choice-prompt="collectBindChoicePrompt"
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

      <section v-if="showTextBlocks" class="trait-browser__section">
        <ul class="trait-browser__text-blocks">
          <li
            v-for="(block, index) in textBlocks"
            :key="index"
            class="trait-browser__text-block"
          >
            <span class="trait-browser__detail-text">{{ block.text }}</span>
            <sub v-if="block.subscript" class="trait-browser__text-sub">{{
              block.subscript
            }}</sub>
          </li>
        </ul>
      </section>

      <section v-else-if="showDescription" class="trait-browser__section">
        <h3 class="trait-browser__section-title">
          {{ resolvedDescriptionLabel }}
        </h3>
        <p class="trait-browser__detail-text">
          {{ description }}
        </p>
      </section>

      <p
        v-if="!showSource && !showTextBlocks && !showDescription"
        class="trait-browser__empty"
      >
        No additional details available.
      </p>
    </div>
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

.trait-browser__card--with-art {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr);
  padding: 0;
  overflow: hidden;
}

.trait-browser__art {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 1.15rem 0.85rem;
  background: linear-gradient(135deg, #102338, #162e4c, #0d1625);
}

.trait-browser__art-image {
  height: 100%;
}

.trait-browser__art-icon {
  display: block;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: auto;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
}

.trait-browser__art--placeholder {
  display: block;
  padding: 0;
}

.trait-browser__card--with-art .trait-browser__content {
  min-width: 0;
  overflow: auto;
  padding: 1.15rem 1.25rem 1.35rem;
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

.trait-browser__card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  min-width: 0;
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

.trait-browser__text-blocks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.trait-browser__text-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
}

.trait-browser__text-sub {
  font-size: 0.78em;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.58);
  font-style: italic;
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

  .trait-browser__card--with-art {
    grid-template-columns: 1fr;
  }

  .trait-browser__art {
    min-height: 0;
    padding: 1rem;
  }
}
</style>
