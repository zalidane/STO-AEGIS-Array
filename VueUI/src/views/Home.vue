<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  BuildOfTheDayDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  TraitsDocument,
  type ShipsQuery,
  type StarshipTraitsQuery,
  type TraitsQuery,
} from "@/graphql/generated/graphql";
import HomeSectionCard from "@/components/home/HomeSectionCard.vue";
import FeaturedShipCard from "@/components/home/FeaturedShipCard.vue";
import FeaturedBuildCard from "@/components/home/FeaturedBuildCard.vue";
import TraitDetailCard from "@/components/traits/TraitDetailCard.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import {
  buildHomeSectionCards,
  keepOrPickRandom,
} from "@/logic/homeFeatured";
import {
  mapPersonalTraitToBrowserItem,
  mapStarshipTraitToBrowserItem,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";
import {
  allowsAccountUnlockFromGrantingShips,
  bindScopeForKind,
} from "@/logic/collection/bind";
import { bindChoiceFromGrantingShips } from "@/logic/collection/bindChoice";
import type { BindScope } from "@/logic/collection/types";
import {
  FALLBACK_STARSHIP_TRAIT_IMAGE,
  FALLBACK_TRAIT_IMAGE,
} from "@/utils/traitImage";

const router = useRouter();
const searchText = ref("");

function search() {
  router.push({
    path: "/search",
    query: {
      q: searchText.value,
    },
  });
}

const {
  result: shipsResult,
  loading: shipsLoading,
  error: shipsError,
} = useQuery(ShipsDocument);
const {
  result: traitsResult,
  loading: traitsLoading,
  error: traitsError,
} = useQuery(TraitsDocument);
const {
  result: starshipTraitsResult,
  loading: starshipTraitsLoading,
  error: starshipTraitsError,
} = useQuery(StarshipTraitsDocument);
const { result: botdResult } = useQuery(BuildOfTheDayDocument);

type Ship = ShipsQuery["ships"][number];
type Trait = TraitsQuery["traits"][number];
type StarshipTrait = StarshipTraitsQuery["starshipTraits"][number];

const ships = computed<Ship[]>(() => shipsResult.value?.ships ?? []);
const traits = computed<Trait[]>(() => traitsResult.value?.traits ?? []);
const starshipTraits = computed<StarshipTrait[]>(
  () => starshipTraitsResult.value?.starshipTraits ?? [],
);

const featuredShip = ref<Ship | null>(null);
const featuredTraitSource = ref<Trait | null>(null);
const featuredStarshipTraitSource = ref<StarshipTrait | null>(null);

watch(
  ships,
  (items) => {
    featuredShip.value = keepOrPickRandom(featuredShip.value, items);
  },
  { immediate: true },
);

watch(
  traits,
  (items) => {
    featuredTraitSource.value = keepOrPickRandom(
      featuredTraitSource.value,
      items,
    );
  },
  { immediate: true },
);

watch(
  starshipTraits,
  (items) => {
    featuredStarshipTraitSource.value = keepOrPickRandom(
      featuredStarshipTraitSource.value,
      items,
    );
  },
  { immediate: true },
);

const featuredTrait = computed<TraitBrowserItem | null>(() =>
  featuredTraitSource.value
    ? mapPersonalTraitToBrowserItem(featuredTraitSource.value)
    : null,
);

const featuredStarshipTrait = computed<TraitBrowserItem | null>(() =>
  featuredStarshipTraitSource.value
    ? mapStarshipTraitToBrowserItem(featuredStarshipTraitSource.value)
    : null,
);

const buildOfTheDay = computed(() => botdResult.value?.buildOfTheDay ?? null);

function featuredStarshipBind(): BindScope {
  return bindScopeForKind({
    kind: "starshipTrait",
    grantingShipCosts:
      featuredStarshipTraitSource.value?.ships.map((ship) => ship.cost) ?? [],
  });
}

function featuredStarshipUnlock(): boolean {
  return allowsAccountUnlockFromGrantingShips(
    featuredStarshipTraitSource.value?.ships ?? [],
  );
}

function featuredStarshipBindChoicePrompt(): string {
  return bindChoiceFromGrantingShips(
    featuredStarshipTraitSource.value?.ships ?? [],
  ).prompt;
}

const sectionCards = computed(() =>
  buildHomeSectionCards({
    ships: shipsLoading.value ? null : ships.value.length,
    traits: traitsLoading.value ? null : traits.value.length,
    starshipTraits: starshipTraitsLoading.value
      ? null
      : starshipTraits.value.length,
  }),
);

const queryError = computed(
  () =>
    shipsError.value ?? traitsError.value ?? starshipTraitsError.value ?? null,
);
</script>

<template>
  <v-container class="home-page" fluid>
    <header class="registry-header">
      <div class="registry-header__eyebrow">
        STO-AEGIS Array // Command Deck
      </div>
      <div class="registry-header__row">
        <div>
          <h1 class="registry-header__title">STO-AEGIS Array</h1>
          <p class="registry-header__lede">
            Explore ships, traits, consoles, and more for Star Trek Online.
          </p>
        </div>
      </div>

      <label class="registry-search">
        <v-icon size="18" icon="mdi-magnify" />
        <input
          v-model="searchText"
          type="search"
          placeholder="Search STO-AEGIS..."
          @keydown.enter="search"
        />
      </label>
    </header>

    <v-alert v-if="queryError" type="error" class="mb-4">
      {{ queryError.message }}
    </v-alert>

    <section class="home-board" aria-label="Featured catalog">
      <FeaturedBuildCard
        v-if="buildOfTheDay"
        class="home-botd"
        :public-code="buildOfTheDay.publicCode"
        :title="buildOfTheDay.title"
        :ship-name="buildOfTheDay.shipName"
        :fill-count="buildOfTheDay.fillCount"
        :ship="buildOfTheDay.ship"
      />

      <div class="featured-block">
        <loading-panel
          v-if="shipsLoading && !featuredShip"
          message="Featured Ship"
        />
        <FeaturedShipCard v-else-if="featuredShip" :ship="featuredShip" />
        <div v-else class="empty-featured">
          No ships are available to feature.
        </div>
      </div>

      <div class="featured-traits">
        <div class="featured-traits__item">
          <div class="featured-heading">Featured Starship Trait</div>
          <loading-panel
            v-if="starshipTraitsLoading && !featuredStarshipTrait"
            message="Featured Starship Trait"
          />
          <TraitDetailCard
            v-else-if="featuredStarshipTrait"
            :item="featuredStarshipTrait"
            compact
            collect-kind="starshipTrait"
            :collect-bind="featuredStarshipBind()"
            :collect-account-unlock="featuredStarshipUnlock()"
            :collect-bind-choice-prompt="featuredStarshipBindChoicePrompt()"
            :art-src="FALLBACK_STARSHIP_TRAIT_IMAGE"
            source-label="Obtained"
            :details-path="(id) => `/starship-traits/${id}`"
          />
          <div v-else class="empty-featured">
            No starship traits are available to feature.
          </div>
        </div>

        <div class="featured-traits__item">
          <div class="featured-heading">Featured Trait</div>
          <loading-panel
            v-if="traitsLoading && !featuredTrait"
            message="Featured Trait"
          />
          <TraitDetailCard
            v-else-if="featuredTrait"
            :item="featuredTrait"
            compact
            collect-kind="trait"
            collect-bind="character"
            :art-src="FALLBACK_TRAIT_IMAGE"
            :details-path="(id) => `/traits/${id}`"
          />
          <div v-else class="empty-featured">
            No traits are available to feature.
          </div>
        </div>
      </div>

      <nav class="catalog-row" aria-label="Catalog sections">
        <HomeSectionCard
          v-for="section in sectionCards"
          :key="section.key"
          :title="section.title"
          :to="section.to"
          :description="section.description"
          :icon="section.icon"
          :count-label="section.countLabel"
        />
      </nav>
    </section>
  </v-container>
</template>

<style scoped>
.home-page {
  max-width: 1480px;
}

.registry-header {
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
  background-image:
    linear-gradient(rgba(125, 211, 252, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125, 211, 252, 0.03) 1px, transparent 1px);
  background-size: 28px 28px;
}

.registry-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.registry-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.registry-header__title {
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.registry-header__title::before {
  content: "";
  width: 6px;
  height: 1.1em;
  border-radius: 2px;
  background: linear-gradient(180deg, #7dd3fc, #a78bfa);
}

.registry-header__lede {
  margin: 0;
  max-width: 42rem;
  color: rgba(255, 255, 255, 0.68);
  font-size: 1.05rem;
  line-height: 1.45;
}

.registry-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: min(520px, 100%);
  padding: 10px 12px;
  border: 1px solid rgba(125, 211, 252, 0.45);
  color: #7dd3fc;
  background: rgba(8, 18, 30, 0.9);
}

.registry-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #e8f7ff;
  font-size: 0.86rem;
  letter-spacing: 0.06em;
}

.registry-search input::placeholder {
  color: rgba(125, 211, 252, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.home-board {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(16rem, 2fr);
  gap: 1rem;
  align-items: stretch;
}

.home-botd {
  grid-column: 1 / -1;
}

.featured-block {
  min-width: 0;
  display: flex;
}

.featured-block > * {
  flex: 1;
  width: 100%;
}

.featured-traits {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.featured-traits__item {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.featured-traits__item > :last-child {
  flex: 1;
}

.catalog-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.featured-heading {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 0.65rem;
}

.empty-featured {
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

@media (max-width: 1100px) {
  .home-board {
    grid-template-columns: 1fr;
  }

  .home-botd,
  .featured-block,
  .featured-traits,
  .catalog-row {
    grid-column: 1;
  }
}

@media (max-width: 800px) {
  .catalog-row {
    grid-template-columns: 1fr;
  }
}
</style>
