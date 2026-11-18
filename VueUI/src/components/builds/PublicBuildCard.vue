<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";
import { formatPublicBuildDate } from "@/logic/publicBuilds/queryState";

const props = defineProps<{
  to: string;
  title: string;
  shipName: string;
  fillCount?: number | null;
  fillTotal?: number | null;
  featuredCount?: number | null;
  listedAt?: string | Date | null | unknown;
  createdAt?: string | Date | null | unknown;
  dateLabel?: string;
  extraLabels?: string[];
  ship?: {
    id: number;
    name: string;
    image?: string | null;
    type?: string | null;
    tier?: number | null;
  } | null;
}>();

const imageUrl = computed(() =>
  props.ship?.image ? getShipImageUrl(props.ship.image) : FALLBACK_SHIP_IMAGE,
);

const displayShip = computed(() => props.ship?.name ?? props.shipName);

const resolvedDateLabel = computed(() => {
  if (props.dateLabel) return props.dateLabel;
  const formatted = formatPublicBuildDate(props.listedAt ?? props.createdAt);
  return formatted ? `Published ${formatted}` : "";
});

const seatedLabel = computed(() => {
  if (props.fillTotal != null && props.fillTotal > 0) {
    return `${props.fillCount ?? 0}/${props.fillTotal} slots seated`;
  }
  if (props.fillCount != null) return `${props.fillCount} seated`;
  return "";
});
</script>

<template>
  <RouterLink :to="to" class="pub-build">
    <div class="pub-build__art">
      <v-img :src="imageUrl" :alt="displayShip" cover />
    </div>
    <div class="pub-build__body">
      <h2 class="pub-build__title">{{ title }}</h2>
      <p class="pub-build__ship">{{ displayShip }}</p>
      <div class="pub-build__meta">
        <v-chip v-if="ship?.tier != null" size="small" color="primary" variant="outlined">
          Tier {{ ship.tier }}
        </v-chip>
        <v-chip v-if="ship?.type" size="small" color="secondary" variant="outlined">
          {{ ship.type }}
        </v-chip>
        <v-chip v-if="seatedLabel" size="small" variant="tonal">{{ seatedLabel }}</v-chip>
      </div>
      <div class="pub-build__foot">
        <span v-if="resolvedDateLabel">{{ resolvedDateLabel }}</span>
        <span v-if="featuredCount">Featured {{ featuredCount }}×</span>
        <span v-for="label in extraLabels ?? []" :key="label">{{ label }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.pub-build {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr);
  min-height: 10rem;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: linear-gradient(160deg, #152336, #0d1624 70%, #0a121d);
}

.pub-build__art {
  min-height: 8.5rem;
  background: linear-gradient(135deg, #102338, #162e4c, #0d1625);
}

.pub-build__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0.9rem 1rem;
  min-width: 0;
}

.pub-build__title,
.pub-build__ship {
  margin: 0;
}

.pub-build__title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
}

.pub-build__ship {
  color: rgba(255, 255, 255, 0.68);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pub-build__meta,
.pub-build__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pub-build__foot {
  margin-top: auto;
  padding-top: 6px;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
}

@media (max-width: 600px) {
  .pub-build {
    grid-template-columns: 1fr;
  }

  .pub-build__art {
    min-height: 9rem;
  }
}
</style>
