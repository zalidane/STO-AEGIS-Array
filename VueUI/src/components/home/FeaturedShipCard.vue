<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { getFactionColor } from "@/mappers/factionColors";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";
import type { ShipListItem } from "@/logic/shipsBinder";
import {
  resolveFactionAccent,
  resolvePrimaryFaction,
  factionMarkKey,
} from "@/logic/resolvePrimaryFaction";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import {
  allowsAccountUnlockFromCost,
  bindScopeForKind,
} from "@/logic/collection/bind";

const props = defineProps<{
  ship: ShipListItem & {
    image?: string | null;
    facSort?: string | null;
    displayPrefix?: string | null;
  };
}>();

const imageFailed = ref(false);

const imageUrl = computed(() => {
  if (imageFailed.value || !props.ship.image) {
    return FALLBACK_SHIP_IMAGE;
  }
  return getShipImageUrl(props.ship.image);
});

const primaryFaction = computed(() =>
  resolvePrimaryFaction({
    faction: props.ship.faction,
    factionLede: props.ship.factionLede,
    facSort: props.ship.facSort,
  }),
);

const factionColor = computed(() => getFactionColor(primaryFaction.value));
const factionAccent = computed(() =>
  resolveFactionAccent({
    faction: props.ship.faction,
    factionLede: props.ship.factionLede,
    facSort: props.ship.facSort,
  }),
);

const factionLetter = computed(() => {
  const key = factionMarkKey(primaryFaction.value);
  const letters: Record<string, string> = {
    federation: "F",
    klingon: "K",
    romulan: "R",
    dominion: "D",
    cross: "C",
    neutral: "",
  };
  return letters[key] ?? "";
});

const classLine = computed(() => {
  const className = props.ship.displayClass?.trim();
  if (!className) return "";
  const rest = [props.ship.displayPrefix, props.ship.displayType]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return rest ? `${className}-class ${rest}` : `${className}-class`;
});

const collectBind = computed(() =>
  bindScopeForKind({ kind: "ship", shipCost: props.ship.cost }),
);

const allowAccountUnlock = computed(() =>
  allowsAccountUnlockFromCost(props.ship.cost),
);

watch(
  () => props.ship.image,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <RouterLink
    :to="`/ships/${ship.id}`"
    class="featured-ship"
    :style="{ '--faction-accent': factionAccent }"
  >
    <div class="featured-ship__art">
      <span
        v-if="factionLetter"
        class="featured-ship__faction-mark"
        :class="`text-${factionColor}`"
        :title="primaryFaction"
      >
        {{ factionLetter }}
      </span>
      <v-img
        :src="imageUrl"
        :alt="ship.name"
        contain
        class="featured-ship__image"
        @error="() => (imageFailed = true)"
      />
    </div>

    <div class="featured-ship__body">
      <div class="featured-ship__eyebrow">Featured Ship</div>
      <h2 class="featured-ship__name" :class="`text-${factionColor}`">
        {{ ship.name }}
      </h2>
      <p v-if="classLine" class="featured-ship__class">{{ classLine }}</p>

      <div class="featured-ship__meta">
        <v-chip
          v-if="ship.tier != null"
          size="small"
          color="primary"
          variant="outlined"
        >
          Tier {{ ship.tier }}
        </v-chip>
        <v-chip
          v-if="ship.type"
          size="small"
          color="secondary"
          variant="outlined"
        >
          {{ ship.type }}
        </v-chip>
        <v-chip
          v-if="primaryFaction"
          size="small"
          :color="factionColor"
          variant="tonal"
        >
          {{ primaryFaction }}
        </v-chip>
      </div>

      <div class="featured-ship__cta-row">
        <div class="featured-ship__cta">View ship details</div>
        <div @click.prevent.stop @mousedown.prevent.stop>
          <CollectToggle
            compact
            kind="ship"
            :catalog-id="ship.id"
            :bind="collectBind"
            :allow-account-unlock="allowAccountUnlock"
          />
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.featured-ship {
  display: grid;
  grid-template-columns: minmax(16rem, 0.9fr) minmax(0, 1.2fr);
  height: 100%;
  min-height: 17rem;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  border-radius: 16px;
  border: 2px solid var(--faction-accent, #9e9e9e);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 35%),
    linear-gradient(160deg, #152336, #0d1624 70%, #0a121d);
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px
      color-mix(in srgb, var(--faction-accent, #9e9e9e) 18%, transparent);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.featured-ship:hover,
.featured-ship:focus-visible {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--faction-accent) 70%, white);
  box-shadow:
    0 18px 36px rgba(0, 0, 0, 0.45),
    0 0 0 1px color-mix(in srgb, var(--faction-accent) 45%, transparent),
    0 0 28px color-mix(in srgb, var(--faction-accent) 28%, transparent);
  outline: none;
}

.featured-ship__art {
  position: relative;
  min-height: 16rem;
  background:
    radial-gradient(
      circle at center,
      color-mix(in srgb, var(--faction-accent) 35%, transparent) 0%,
      transparent 70%
    ),
    linear-gradient(135deg, #102338, #162e4c, #0d1625);
}

.featured-ship__faction-mark {
  position: absolute;
  top: 14px;
  left: 16px;
  z-index: 2;
  font-family: "Orbitron", "Eurostile", "Bank Gothic", "Microgramma", sans-serif;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);
  pointer-events: none;
}

.featured-ship__image {
  height: 100%;
}

.featured-ship__image :deep(img) {
  filter: drop-shadow(
    0 0 18px color-mix(in srgb, var(--faction-accent) 35%, transparent)
  );
}

.featured-ship__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 1.35rem 1.5rem 1.4rem;
}

.featured-ship__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.featured-ship__name {
  margin: 0;
  font-size: clamp(1.45rem, 2.4vw, 2.1rem);
  font-weight: 700;
  line-height: 1.2;
}

.featured-ship__class {
  margin: 0;
  color: rgba(255, 255, 255, 0.62);
  letter-spacing: 0.04em;
}

.featured-ship__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.featured-ship__cta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 12px;
}

.featured-ship__cta {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  font-weight: 650;
}

@media (max-width: 800px) {
  .featured-ship {
    grid-template-columns: 1fr;
  }

  .featured-ship__art {
    min-height: 12rem;
  }
}
</style>
