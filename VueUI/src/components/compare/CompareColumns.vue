<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { MultiCompareSection } from "@/logic/compare/multi";
import type { CompareTone } from "@/logic/compare/rows";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";

export type CompareColumnHull = {
  id: number;
  name: string;
  image?: string | null;
  tier?: number | null;
  type?: string | null;
};

defineProps<{
  hulls: CompareColumnHull[];
  sections: MultiCompareSection[];
}>();

const emit = defineEmits<{
  remove: [shipId: number];
}>();

function imageFor(ship: CompareColumnHull): string {
  if (!ship.image) return FALLBACK_SHIP_IMAGE;
  return getShipImageUrl(ship.image);
}

function toneClass(tone: CompareTone): string {
  if (tone === "improve") return "stat-row--improve";
  if (tone === "decrease") return "stat-row--decrease";
  if (tone === "diff") return "stat-row--changed";
  return "";
}
</script>

<template>
  <div v-if="hulls.length > 0" class="compare-scroll">
    <div class="compare-sheet">
      <div class="compare-track">
        <article v-for="hull in hulls" :key="hull.id" class="hero-card">
          <RouterLink :to="`/ships/${hull.id}`" class="hero-card__art">
            <img
              :src="imageFor(hull)"
              :alt="hull.name"
              class="hero-card__photo"
            />
          </RouterLink>
          <div class="hero-card__copy">
            <RouterLink :to="`/ships/${hull.id}`" class="hero-card__name">
              {{ hull.name }}
            </RouterLink>
            <div class="hero-card__meta">
              <span v-if="hull.tier != null">Tier {{ hull.tier }}</span>
              <span v-if="hull.type">{{ hull.type }}</span>
            </div>
          </div>
          <v-btn
            icon
            size="x-small"
            variant="text"
            :aria-label="`Remove ${hull.name}`"
            @click="emit('remove', hull.id)"
          >
            <v-icon icon="mdi-close" size="16" />
          </v-btn>
        </article>
      </div>

      <section
        v-for="section in sections"
        :key="section.id"
        class="compare-section"
      >
        <h2 class="compare-section__title">{{ section.title }}</h2>
        <div class="compare-track">
          <v-card
            v-for="(hull, index) in hulls"
            :key="`${section.id}-${hull.id}`"
            rounded="xl"
            class="stat-card"
          >
            <div class="stat-card__body">
              <div
                v-for="row in section.rows"
                :key="row.key"
                class="stat-row"
                :class="toneClass(row.cells[index]?.tone ?? null)"
              >
                <span>{{ row.label }}</span>
                <span>{{ row.cells[index]?.text ?? "—" }}</span>
              </div>
            </div>
          </v-card>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.compare-scroll {
  overflow-x: auto;
  margin-bottom: 0.5rem;
}

.compare-sheet {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  width: max(100%, max-content);
}

.compare-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(15.5rem, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.hero-card {
  display: grid;
  grid-template-columns: 4.75rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 5.5rem;
  padding: 0.75rem 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 22, 36, 0.85);
}

.hero-card__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.75rem;
  height: 4rem;
  overflow: hidden;
  border-radius: 8px;
  background: #102338;
}

.hero-card__photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center center;
}

.hero-card__copy {
  min-width: 0;
}

.hero-card__name {
  color: inherit;
  text-decoration: none;
  font-weight: 700;
}

.hero-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.25rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

.compare-section__title {
  margin: 0 0 0.55rem;
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.stat-card {
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 22, 36, 0.85);
}

.stat-card__body {
  display: flex;
  flex-direction: column;
  padding: 0.35rem 0.85rem 0.55rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  min-height: 1.85rem;
  padding: 0.28rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.9rem;
}

.stat-row span:last-child {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.stat-row--improve span:last-child {
  color: #4ade80;
  font-weight: 650;
}

.stat-row--decrease span:last-child {
  color: #f87171;
  font-weight: 650;
}

.stat-row--changed span:last-child {
  color: #facc15;
  font-weight: 650;
}
</style>
