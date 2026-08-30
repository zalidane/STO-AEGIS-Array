<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";

const props = defineProps<{
  publicCode: string;
  title: string;
  shipName: string;
  fillCount: number;
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
</script>

<template>
  <RouterLink :to="`/b/${publicCode}`" class="featured-build">
    <div class="featured-build__art">
      <v-img :src="imageUrl" :alt="ship?.name ?? shipName" contain />
    </div>
    <div class="featured-build__body">
      <div class="featured-build__eyebrow">Build of the Day</div>
      <h2 class="featured-build__title">{{ title }}</h2>
      <p class="featured-build__ship">{{ ship?.name ?? shipName }}</p>
      <div class="featured-build__meta">
        <v-chip v-if="ship?.tier != null" size="small" color="primary" variant="outlined">
          Tier {{ ship.tier }}
        </v-chip>
        <v-chip v-if="ship?.type" size="small" color="secondary" variant="outlined">
          {{ ship.type }}
        </v-chip>
        <v-chip size="small" variant="tonal">{{ fillCount }} seated</v-chip>
      </div>
      <div class="featured-build__cta">Open shared board</div>
    </div>
  </RouterLink>
</template>

<style scoped>
.featured-build {
  display: grid;
  grid-template-columns: minmax(14rem, 0.8fr) minmax(0, 1.2fr);
  min-height: 14rem;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: linear-gradient(160deg, #152336, #0d1624 70%, #0a121d);
}

.featured-build__art {
  min-height: 12rem;
  background: linear-gradient(135deg, #102338, #162e4c, #0d1625);
}

.featured-build__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 1.2rem 1.35rem;
}

.featured-build__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.featured-build__title,
.featured-build__ship {
  margin: 0;
}

.featured-build__title {
  font-size: 1.45rem;
  font-weight: 700;
}

.featured-build__ship {
  color: rgba(255, 255, 255, 0.68);
}

.featured-build__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.featured-build__cta {
  margin-top: auto;
  padding-top: 10px;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  font-weight: 650;
}

@media (max-width: 800px) {
  .featured-build {
    grid-template-columns: 1fr;
  }
}
</style>
