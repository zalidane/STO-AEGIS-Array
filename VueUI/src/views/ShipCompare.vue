<script setup lang="ts">
import { computed, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import { ShipsDocument, type ShipsQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import { useCompareStore } from "@/stores/compare";
import { buildCompareSections, type CompareHull } from "@/logic/compare/rows";
import { parseCompareQuery } from "@/logic/compare/selection";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";

const route = useRoute();
const router = useRouter();
const compare = useCompareStore();
const { ids, ready, path } = storeToRefs(compare);

const { result, loading, error } = useQuery(ShipsDocument);

type Ship = ShipsQuery["ships"][number];

const ships = computed<Ship[]>(() => result.value?.ships ?? []);

function shipFor(id: number | undefined): Ship | null {
  if (id == null) return null;
  return ships.value.find((row) => row.id === id) ?? null;
}

const leftId = computed(() => ids.value[0]);
const rightId = computed(() => ids.value[1]);
const leftShip = computed(() => shipFor(leftId.value));
const rightShip = computed(() => shipFor(rightId.value));

const sections = computed(() => {
  if (!leftShip.value || !rightShip.value) return [];
  return buildCompareSections(leftShip.value, rightShip.value);
});

function imageFor(ship: CompareHull | null): string {
  if (!ship?.image) return FALLBACK_SHIP_IMAGE;
  return getShipImageUrl(ship.image);
}

watch(
  () => route.query,
  (query) => {
    if (route.path !== "/ships/compare") return;
    const fromQuery = parseCompareQuery(query);
    if (fromQuery.length === 0) return;
    const current = ids.value.join(",");
    if (fromQuery.join(",") === current) return;
    compare.replace(fromQuery);
  },
  { immediate: true },
);

watch(
  path,
  (next) => {
    if (route.path !== "/ships/compare") return;
    if (route.fullPath === next) return;
    router.replace(next);
  },
);

function swap() {
  if (ids.value.length !== 2) return;
  compare.replace([ids.value[1]!, ids.value[0]!]);
}
</script>

<template>
  <v-container class="compare-page" fluid>
    <AppBreadcrumbs />
    <loading-panel v-if="loading" message="Compare hulls" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>

    <template v-else>
      <header class="compare-header">
        <div>
          <div class="compare-header__eyebrow">STO-AEGIS Array // Drydock</div>
          <h1 class="compare-header__title">Compare hulls</h1>
          <p class="compare-header__lede">
            Two vessels, same cards, same rows. Select hulls from the ship
            browser, collection, or a ship page.
          </p>
        </div>
        <div class="compare-header__actions">
          <v-btn
            variant="outlined"
            size="small"
            prepend-icon="mdi-swap-horizontal"
            :disabled="!ready"
            @click="swap"
          >
            Swap sides
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            :disabled="ids.length === 0"
            @click="compare.clear()"
          >
            Clear
          </v-btn>
        </div>
      </header>

      <div class="compare-pair compare-pair--hero">
        <article v-if="leftShip" class="hero-card">
          <RouterLink :to="`/ships/${leftShip.id}`" class="hero-card__art">
            <img
              :src="imageFor(leftShip)"
              :alt="leftShip.name"
              class="hero-card__photo"
            />
          </RouterLink>
          <div>
            <RouterLink :to="`/ships/${leftShip.id}`" class="hero-card__name">
              {{ leftShip.name }}
            </RouterLink>
            <div class="hero-card__meta">
              <span v-if="leftShip.tier != null">Tier {{ leftShip.tier }}</span>
              <span v-if="leftShip.type">{{ leftShip.type }}</span>
            </div>
          </div>
          <v-btn
            icon
            size="x-small"
            variant="text"
            aria-label="Remove left hull"
            @click="compare.remove(leftShip.id)"
          >
            <v-icon icon="mdi-close" size="16" />
          </v-btn>
        </article>
        <article v-else class="hero-card hero-card--empty">
          <p>Select a first hull.</p>
          <v-btn to="/ships" size="small" variant="outlined">Ship browser</v-btn>
        </article>

        <article v-if="rightShip" class="hero-card">
          <RouterLink :to="`/ships/${rightShip.id}`" class="hero-card__art">
            <img
              :src="imageFor(rightShip)"
              :alt="rightShip.name"
              class="hero-card__photo"
            />
          </RouterLink>
          <div>
            <RouterLink :to="`/ships/${rightShip.id}`" class="hero-card__name">
              {{ rightShip.name }}
            </RouterLink>
            <div class="hero-card__meta">
              <span v-if="rightShip.tier != null">Tier {{ rightShip.tier }}</span>
              <span v-if="rightShip.type">{{ rightShip.type }}</span>
            </div>
          </div>
          <v-btn
            icon
            size="x-small"
            variant="text"
            aria-label="Remove right hull"
            @click="compare.remove(rightShip.id)"
          >
            <v-icon icon="mdi-close" size="16" />
          </v-btn>
        </article>
        <article v-else class="hero-card hero-card--empty">
          <p>Select a second hull to compare.</p>
          <v-btn to="/collection?tab=ship" size="small" variant="outlined">
            Collection
          </v-btn>
        </article>
      </div>

      <p v-if="leftId && !leftShip && !loading" class="missing">
        Left hull #{{ leftId }} is not in the catalog.
      </p>
      <p v-if="rightId && !rightShip && !loading" class="missing">
        Right hull #{{ rightId }} is not in the catalog.
      </p>

      <section
        v-for="section in sections"
        :key="section.id"
        class="compare-section"
      >
        <h2 class="compare-section__title">{{ section.title }}</h2>
        <div class="compare-pair">
          <v-card
            v-for="side in ['left', 'right'] as const"
            :key="side"
            rounded="xl"
            class="stat-card"
          >
            <div class="stat-card__body">
              <div
                v-for="row in section.rows"
                :key="row.key"
                class="stat-row"
                :class="{
                  'stat-row--diff': row.differs,
                  'stat-row--win': row.advantage === side,
                  'stat-row--match':
                    side === 'left' ? row.leftMatch : row.rightMatch,
                }"
              >
                <span>{{ row.label }}</span>
                <span>{{ side === 'left' ? row.left : row.right }}</span>
              </div>
            </div>
          </v-card>
        </div>
      </section>
    </template>
  </v-container>
</template>

<style scoped>
.compare-page {
  max-width: 1200px;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(125, 211, 252, 0.45);
}

.compare-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.compare-header__title {
  margin: 0 0 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.compare-header__lede {
  margin: 0;
  max-width: 36rem;
  color: rgba(255, 255, 255, 0.68);
}

.compare-header__actions {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.compare-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: stretch;
}

.compare-pair--hero {
  margin-bottom: 1.5rem;
}

.hero-card {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 5.5rem;
  padding: 0.75rem 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 22, 36, 0.85);
}

.hero-card--empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.65rem;
  color: rgba(255, 255, 255, 0.65);
}

.hero-card__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5.5rem;
  height: 4.25rem;
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

.compare-section {
  margin-bottom: 1.15rem;
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

.stat-row--diff span:last-child {
  color: rgba(255, 255, 255, 0.92);
}

.stat-row--win span:last-child,
.stat-row--match span:last-child {
  color: #7dd3fc;
  font-weight: 650;
}

.missing {
  color: rgba(255, 180, 120, 0.9);
}

@media (max-width: 800px) {
  .compare-pair {
    grid-template-columns: 1fr;
  }
}
</style>
