<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { getFactionColor } from "@/mappers/factionColors";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";
import type { ShipListItem } from "@/logic/shipsBinder";
import {
  resolveFactionAccent,
  resolvePrimaryFaction,
  factionMarkKey,
} from "@/logic/resolvePrimaryFaction";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import CompareToggle from "@/components/compare/CompareToggle.vue";
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

const emit = defineEmits<{
  select: [shipId: number];
}>();

const imageFailed = ref(false);

const imageUrl = computed(() => {
  if (imageFailed.value || !props.ship.image) {
    return FALLBACK_SHIP_IMAGE;
  }
  return getShipImageUrl(props.ship.image);
});

const collectBind = computed(() =>
  bindScopeForKind({ kind: "ship", shipCost: props.ship.cost }),
);

const allowAccountUnlock = computed(() =>
  allowsAccountUnlockFromCost(props.ship.cost, props.ship),
);

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

watch(
  () => props.ship.image,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <div
    class="ship-card"
    :style="{ '--faction-accent': factionAccent }"
  >
    <button
      type="button"
      class="ship-card__select"
      @click="emit('select', ship.id)"
    >
    <div class="ship-card__frame">
      <div class="ship-card__art">
        <span
          v-if="factionLetter"
          class="ship-card__faction-mark"
          :class="`text-${factionColor}`"
          :title="primaryFaction"
        >
          {{ factionLetter }}
        </span>
        <v-img
          :src="imageUrl"
          :alt="ship.name"
          cover
          class="ship-card__image"
          @error="() => (imageFailed = true)"
        />
      </div>

      <div class="ship-card__body">
        <div class="ship-card__name" :class="`text-${factionColor}`">
          {{ ship.name }}
        </div>
        <div class="ship-card__meta">
          <v-chip
            v-if="ship.tier != null"
            size="x-small"
            color="primary"
            variant="outlined"
          >
            Tier {{ ship.tier }}
          </v-chip>
          <v-chip
            v-if="ship.type"
            size="x-small"
            color="secondary"
            variant="outlined"
          >
            {{ ship.type }}
          </v-chip>
        </div>
        <v-chip
          v-if="primaryFaction"
          size="x-small"
          :color="factionColor"
          variant="tonal"
          class="ship-card__faction"
        >
          {{ primaryFaction }}
        </v-chip>
      </div>
    </div>
    </button>
    <div class="ship-card__compare">
      <CompareToggle compact :ship-id="ship.id" />
    </div>
    <div class="ship-card__collect">
      <CollectToggle
        compact
        kind="ship"
        :catalog-id="ship.id"
        :bind="collectBind"
        :allow-account-unlock="allowAccountUnlock"
        :cost="ship.cost"
        :display-prefix="ship.displayPrefix"
        :hull-name="ship.name"
      />
    </div>
  </div>
</template>

<style scoped>
.ship-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  z-index: 1;
  transition: transform 160ms ease, z-index 0s;
}

.ship-card:hover,
.ship-card:focus-within {
  transform: scale(1.08);
  z-index: 5;
}

.ship-card__select {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  width: 100%;
  height: 100%;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.ship-card__select:focus-visible {
  outline: none;
}

.ship-card__compare {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 6;
}

.ship-card__collect {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 6;
}

.ship-card__frame {
  height: 100%;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--faction-accent, #9e9e9e);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 35%),
    linear-gradient(160deg, #152336, #0d1624 70%, #0a121d);
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px color-mix(in srgb, var(--faction-accent, #9e9e9e) 18%, transparent);
}

.ship-card:hover .ship-card__frame,
.ship-card:focus-within .ship-card__frame {
  border-color: color-mix(in srgb, var(--faction-accent) 70%, white);
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.45),
    0 0 0 1px color-mix(in srgb, var(--faction-accent) 45%, transparent),
    0 0 24px color-mix(in srgb, var(--faction-accent) 30%, transparent);
}

.ship-card__art {
  position: relative;
  height: 118px;
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--faction-accent) 35%, transparent) 0%, transparent 70%),
    linear-gradient(135deg, #102338, #162e4c, #0d1625);
}

.ship-card__faction-mark {
  position: absolute;
  top: 8px;
  left: 10px;
  z-index: 2;
  font-family: "Orbitron", "Eurostile", "Bank Gothic", "Microgramma", sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65);
  pointer-events: none;
}

.ship-card__image {
  height: 100%;
}

.ship-card__image :deep(img) {
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--faction-accent) 35%, transparent));
}

.ship-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
  flex: 1;
}

.ship-card__name {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.25;
  min-height: 2.5em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ship-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ship-card__faction {
  align-self: flex-start;
  margin-top: auto;
}
</style>
