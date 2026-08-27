<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useDisplay } from "vuetify";

import { useQuery } from "@vue/apollo-composable";
import { ShipDocument, type ShipQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import { parseBoffSeats } from "@/mappers/boffColors";
import { getFactionColor, getFactionGlow } from "@/mappers/factionColors";
import { formatWikiDate, formatYesNo } from "@/utils/formatters";
import { formatFactionsByFacSort } from "@/utils/sortFactionsByFacSort";
import { parseShipCost, type ShipCost } from "@/utils/parsers";
import { FALLBACK_SHIP_IMAGE, getShipImageUrl } from "@/utils/shipImage";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import {
  allowsAccountUnlockFromCost,
  bindScopeFromShipCost,
} from "@/logic/collection/bind";
import { shipsListQueryForAcquisition } from "@/logic/shipsBinder";
import {
  densityFromWidth,
  getShipDetailLabels,
  SHIP_DETAIL_FULL_LABELS,
} from "@/logic/shipDetailLabels";

const route = useRoute();
const display = useDisplay();

const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(ShipDocument, () => ({
  id: id.value,
}));

type ShipDetail = NonNullable<ShipQuery["ship"]>;

const ship = computed<ShipDetail | null>(() => result.value?.ship ?? null);

const labels = computed(() =>
  getShipDetailLabels(densityFromWidth(display.width.value)),
);

const formattedFactions = computed(() => {
  if (!ship.value) return [];

  return formatFactionsByFacSort(ship.value.faction, ship.value.facSort)
    .split(",")
    .map((faction) => faction.trim())
    .filter((faction) => faction && faction !== "N/A");
});

const factionGlow = computed(() => getFactionGlow(formattedFactions.value[0]));

const boffSeats = computed(() => parseBoffSeats(ship.value?.boffs));

const parsedCosts = computed<ShipCost[]>(() => parseShipCost(ship.value?.cost));

const collectBind = computed(() => bindScopeFromShipCost(ship.value?.cost));
const allowAccountUnlock = computed(() =>
  allowsAccountUnlockFromCost(ship.value?.cost),
);

const powerDisplay = computed(() => {
  const all = ship.value?.powerAll ?? 0;

  return {
    weapons: ship.value?.powerWeapons ?? all,
    shields: ship.value?.powerShields ?? all,
    engines: ship.value?.powerEngines ?? all,
    auxiliary: ship.value?.powerAuxiliary ?? all,
  };
});

const imageFailed = ref(false);
const imageUrl = computed(() => {
  if (imageFailed.value || !ship.value?.image) {
    return FALLBACK_SHIP_IMAGE;
  }

  return getShipImageUrl(ship.value.image);
});

watch(
  () => ship.value?.image,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <v-container class="ship-details" fluid>
    <AppBreadcrumbs :title="ship?.name" />
    <loading-panel v-if="loading" :message="'Ship Details'" />

    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="ship">
      <v-row>
        <v-col cols="12" md="9">
          <v-card color="surface" rounded="xl" class="mb-4">
            <v-card-text>
              <v-row align="stretch" class="mb-4">
                <v-col cols="12" sm="8" class="d-flex flex-column justify-center">
                  <div class="ship-title font-weight-light">
                    {{ ship.name }}
                  </div>
                </v-col>

                <v-col
                  cols="12"
                  sm="4"
                  class="d-flex flex-column justify-space-between align-sm-end ga-3"
                >
                  <div class="d-flex flex-column align-sm-end ga-2">
                    <CollectToggle
                      kind="ship"
                      :catalog-id="ship.id"
                      :bind="collectBind"
                      :allow-account-unlock="allowAccountUnlock"
                    />
                    <v-btn
                      :to="`/ships/${ship.id}/loadout`"
                      color="primary"
                      variant="outlined"
                      size="small"
                      prepend-icon="mdi-view-dashboard-outline"
                    >
                      Loadout
                    </v-btn>
                  </div>
                  <div class="d-flex justify-sm-end flex-wrap ga-1">
                    <v-chip
                      v-for="faction in formattedFactions"
                      :key="faction"
                      :color="getFactionColor(faction)"
                      size="small"
                      variant="outlined"
                    >
                      {{ faction }}
                    </v-chip>
                  </div>

                  <div class="d-flex flex-wrap justify-sm-end ga-2">
                    <v-chip color="primary" size="small" variant="outlined">
                      Tier {{ ship.tier }}
                    </v-chip>

                    <v-chip color="secondary" size="small" variant="outlined">
                      {{ ship.type }}
                    </v-chip>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="mb-4" />

              <div
                class="hero-image"
                :style="{
                  background: `radial-gradient(circle at center, ${factionGlow}55 0%, transparent 70%),
                    linear-gradient(135deg,#102338,#162e4c,#0d1625)`,
                }"
              >
                <v-img :src="imageUrl" @error="() => (imageFailed = true)" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card rounded="xl" class="glass-panel detail-card detail-card--tall mb-4">
            <v-card-title
              class="text-primary detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.combatTitle"
            >
              <v-icon class="mr-2" size="small">mdi-shield</v-icon>
              {{ labels.combatTitle }}
            </v-card-title>

            <v-divider />

            <div class="detail-card__body">
              <div class="stat-row">
                <span>Hull</span>
                <span>{{ ship.hull?.toLocaleString() }}</span>
              </div>
              <div class="stat-row">
                <span>Hull Mod</span>
                <span>{{ ship.hullMod }}</span>
              </div>
              <div class="stat-row">
                <span>Shield Mod</span>
                <span>{{ ship.shieldMod }}</span>
              </div>

              <v-row class="mt-2" dense>
                <v-col cols="6">
                  <div class="section-header text-medium-emphasis text-uppercase text-caption">
                    <span>{{ labels.speedHeader }}</span>
                  </div>

                  <div class="stat-stack">
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.turnRate"
                    >
                      <span>{{ labels.turnRate }}</span>
                      <span>{{ ship.turnRate }}</span>
                    </div>
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.inertia"
                    >
                      <span>{{ labels.inertia }}</span>
                      <span>{{ ship.inertia }}</span>
                    </div>
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.impulse"
                    >
                      <span>{{ labels.impulse }}</span>
                      <span>{{ ship.impulse }}</span>
                    </div>
                  </div>
                </v-col>

                <v-col cols="6">
                  <div class="section-header text-medium-emphasis text-uppercase text-caption">
                    <span>{{ labels.powerHeader }}</span>
                  </div>

                  <div class="stat-stack">
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.weapons"
                    >
                      <span class="stat-row__label">
                        <v-icon size="x-small" color="error">mdi-crosshairs</v-icon>
                        {{ labels.weapons }}
                      </span>
                      <span>{{ powerDisplay.weapons ?? "—" }}</span>
                    </div>
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.shields"
                    >
                      <span class="stat-row__label">
                        <v-icon size="x-small" color="info">mdi-shield</v-icon>
                        {{ labels.shields }}
                      </span>
                      <span>{{ powerDisplay.shields ?? "—" }}</span>
                    </div>
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.engines"
                    >
                      <span class="stat-row__label">
                        <v-icon size="x-small" color="warning">mdi-rocket-launch</v-icon>
                        {{ labels.engines }}
                      </span>
                      <span>{{ powerDisplay.engines ?? "—" }}</span>
                    </div>
                    <div
                      class="stat-row"
                      :title="SHIP_DETAIL_FULL_LABELS.auxiliary"
                    >
                      <span class="stat-row__label">
                        <v-icon size="x-small" color="dominion">mdi-auto-fix</v-icon>
                        {{ labels.auxiliary }}
                      </span>
                      <span>{{ powerDisplay.auxiliary ?? "—" }}</span>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </div>
          </v-card>

          <v-card rounded="xl" class="glass-panel detail-card detail-card--short">
            <v-card-title
              class="text-miracle detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.acquisitionTitle"
            >
              <v-icon class="mr-2" size="small">mdi-store</v-icon>
              {{ labels.acquisitionTitle }}
            </v-card-title>

            <v-divider />

            <div class="detail-card__body">
              <RouterLink
                v-for="cost in parsedCosts"
                :key="`${cost.currencyCode}-${cost.amount}`"
                class="stat-row stat-row--link"
                :to="{ path: '/ships', query: shipsListQueryForAcquisition(cost) }"
              >
                <span class="stat-row__label">
                  <span
                    class="currency-dot"
                    :style="{ borderColor: cost.color }"
                  />
                  {{ cost.label }}
                </span>
                <span>{{ cost.amount }}</span>
              </RouterLink>

              <div class="stat-row" :title="SHIP_DETAIL_FULL_LABELS.level">
                <span>{{ labels.level }}</span>
                <span>{{ ship.rankLevel }}</span>
              </div>

              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.releaseDate"
              >
                <span>{{ labels.releaseDate }}</span>
                <span>{{ ship.released ? formatWikiDate(ship.released) : "" }}</span>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2" dense align="stretch">
        <v-col cols="12" sm="6" md="3">
          <v-card rounded="xl" class="glass-panel detail-card detail-card--panel">
            <v-card-title
              class="detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.bridgeTitle"
            >
              <v-icon class="mr-2" size="small">mdi-account-box</v-icon>
              {{ labels.bridgeTitle }}
            </v-card-title>
            <v-divider />

            <div class="detail-card__body">
              <div class="d-flex flex-wrap ga-2">
                <v-chip
                  v-for="seat in boffSeats"
                  :key="seat.raw"
                  size="small"
                  variant="outlined"
                  :color="seat.career"
                  class="font-weight-bold justify-center boff-chip"
                  :class="{ 'boff-chip--hybrid': !!seat.specialization }"
                  :style="
                    seat.specialization
                      ? {
                          '--boff-career': `rgb(var(--v-theme-${seat.career}))`,
                          '--boff-spec': `rgb(var(--v-theme-${seat.specialization}))`,
                        }
                      : undefined
                  "
                >
                  <span>{{ seat.careerLabel }}</span>
                  <span
                    v-if="seat.specializationLabel"
                    :class="
                      seat.specialization
                        ? `text-${seat.specialization}`
                        : undefined
                    "
                  >
                    -{{ seat.specializationLabel }}
                  </span>
                </v-chip>
              </div>

              <div class="section-header text-medium-emphasis text-uppercase text-caption mt-4">
                <span>{{ labels.consolesHeader }}</span>
              </div>
              <div class="d-flex justify-center flex-wrap ga-2 mt-3">
                <v-chip size="small" color="engineering">
                  ENG {{ ship.engineeringSlots }}
                </v-chip>
                <v-chip size="small" color="science">
                  SCI {{ ship.scienceSlots }}
                </v-chip>
                <v-chip size="small" color="tactical">
                  TAC {{ ship.tacticalSlots }}
                </v-chip>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-card rounded="xl" class="glass-panel detail-card detail-card--panel">
            <v-card-title
              class="detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.weaponsTitle"
            >
              <v-icon class="mr-2" size="small">mdi-explosion</v-icon>
              {{ labels.weaponsTitle }}
            </v-card-title>
            <v-divider />

            <div class="detail-card__body">
              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.foreWeapons"
              >
                <span>{{ labels.foreWeapons }}</span>
                <span>{{ ship.foreWeapons }}</span>
              </div>
              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.aftWeapons"
              >
                <span>{{ labels.aftWeapons }}</span>
                <span>{{ ship.aftWeapons }}</span>
              </div>
              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.typeSpecificSlot"
              >
                <span>{{ labels.typeSpecificSlot }}</span>
                <span>{{ ship.experimental ? "Exp Wpn" : "—" }}</span>
              </div>
              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.canEquipCannons"
              >
                <span>{{ labels.canEquipCannons }}</span>
                <span>{{ formatYesNo(ship.equipCannons) }}</span>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-card rounded="xl" class="glass-panel detail-card detail-card--panel">
            <v-card-title
              class="text-secondary detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.equipmentTitle"
            >
              <v-icon class="mr-2" size="small">mdi-wrench</v-icon>
              {{ labels.equipmentTitle }}
            </v-card-title>
            <v-divider />

            <div class="detail-card__body">
              <RouterLink
                v-if="ship.uniConsole"
                :to="`/items/${ship.uniConsole.id}`"
                class="grant-link"
              >
                <div class="grant-link__label">Unique console</div>
                <div class="grant-link__name">{{ ship.uniConsole.name }}</div>
              </RouterLink>

              <div v-if="ship.experimental" class="grant-flag">
                Experimental weapon slot
              </div>

              <template v-if="ship.abilities">
                <div
                  v-for="ability in ship.abilities.split(',')"
                  :key="ability"
                  class="ability-line"
                  :title="ability.trim()"
                >
                  {{ ability.trim() }}
                </div>
              </template>

              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.deviceSlots"
              >
                <span>{{ labels.deviceSlots }}</span>
                <span>{{ ship.devices }}</span>
              </div>
              <div class="stat-row" :title="SHIP_DETAIL_FULL_LABELS.hangars">
                <span>{{ labels.hangars }}</span>
                <span>{{ ship.hangars ?? 0 }}</span>
              </div>
              <div
                class="stat-row"
                :title="SHIP_DETAIL_FULL_LABELS.secondaryDeflector"
              >
                <span>{{ labels.secondaryDeflector }}</span>
                <span>{{ formatYesNo(ship.secondaryDeflector) }}</span>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card rounded="xl" class="glass-panel detail-card detail-card--panel">
            <v-card-title
              class="text-dominion detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.traitsTitle"
            >
              <v-icon class="mr-2" size="small">mdi-star</v-icon>
              {{ labels.traitsTitle }}
            </v-card-title>
            <v-divider />

            <div class="detail-card__body">
              <div
                v-for="trait in ship.starshipTraits"
                :key="trait.id"
                class="trait-block"
              >
                <RouterLink
                  :to="`/starship-traits/${trait.id}`"
                  class="trait-block__name"
                  :title="trait.name"
                >
                  {{ trait.name }}
                </RouterLink>
                <div
                  v-if="trait.short"
                  class="trait-block__short text-medium-emphasis"
                  :title="trait.short"
                >
                  {{ trait.short }}
                </div>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="2">
          <v-card rounded="xl" class="glass-panel detail-card detail-card--panel">
            <v-card-title
              class="detail-card__title"
              :title="SHIP_DETAIL_FULL_LABELS.admiraltyTitle"
            >
              <v-icon class="mr-2" size="small">mdi-card-account-details</v-icon>
              {{ labels.admiraltyTitle }}
            </v-card-title>
            <v-divider />

            <div class="detail-card__body admiralty-stack">
              <div
                class="admiralty-row"
                :title="SHIP_DETAIL_FULL_LABELS.engineering"
              >
                <v-avatar color="engineering" variant="tonal" size="32">
                  <v-icon color="engineering" icon="mdi-wrench" size="small" />
                </v-avatar>
                <span class="text-engineering font-weight-bold">
                  {{ labels.engineering }}
                </span>
                <span class="admiralty-row__value text-engineering font-weight-bold">
                  {{ ship.admiraltyEng ?? "—" }}
                </span>
              </div>

              <div
                class="admiralty-row"
                :title="SHIP_DETAIL_FULL_LABELS.tactical"
              >
                <v-avatar color="tactical" variant="tonal" size="32">
                  <v-icon color="tactical" icon="mdi-crosshairs" size="small" />
                </v-avatar>
                <span class="text-tactical font-weight-bold">
                  {{ labels.tactical }}
                </span>
                <span class="admiralty-row__value text-tactical font-weight-bold">
                  {{ ship.admiraltyTac ?? "—" }}
                </span>
              </div>

              <div
                class="admiralty-row"
                :title="SHIP_DETAIL_FULL_LABELS.science"
              >
                <v-avatar color="science" variant="tonal" size="32">
                  <v-icon color="science" icon="mdi-flask" size="small" />
                </v-avatar>
                <span class="text-science font-weight-bold">
                  {{ labels.science }}
                </span>
                <span class="admiralty-row__value text-science font-weight-bold">
                  {{ ship.admiraltySci ?? "—" }}
                </span>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-alert v-else type="warning">Ship not found</v-alert>
  </v-container>
</template>

<style scoped>
.ship-details {
  max-width: 1600px;
}

.ship-title {
  font-size: clamp(1.75rem, 2.4vw, 3rem);
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.hero-image {
  height: min(500px, 42vh);
  max-width: 75%;
  margin: 0 auto;
  position: relative;
}

.hero-image :deep(img) {
  filter: drop-shadow(0 0 30px rgba(80, 180, 255, 0.25))
    drop-shadow(0 0 80px rgba(80, 180, 255, 0.1));
}

.hero-image::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
}

.glass-panel {
  background: rgba(18, 32, 55, 0.85);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.detail-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.detail-card--tall {
  min-height: 340px;
}

.detail-card--short {
  min-height: 220px;
}

.detail-card--panel {
  height: 100%;
  min-height: 280px;
}

.detail-card__title {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  line-height: 1.25;
  font-size: 0.98rem;
  padding-block: 12px;
  min-width: 0;
}

.detail-card__body {
  padding: 12px 14px 16px;
  min-width: 0;
  overflow: hidden;
}

.stat-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  min-width: 0;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 2px 0;
  font-size: 0.9rem;
}

.stat-row > span:first-child,
.stat-row__label {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.stat-row > span:last-child {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.stat-row--link {
  color: inherit;
  text-decoration: none;
  border-radius: 6px;
  padding: 4px 6px;
  margin: 0 -6px;
}

.stat-row--link:hover {
  background: rgba(125, 211, 252, 0.12);
}

.stat-row--link .stat-row__label {
  color: #7dd3fc;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.section-header {
  position: relative;
  text-align: center;
  letter-spacing: 0.08em;
}

.section-header::before,
.section-header::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 28%;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.section-header::before {
  left: 0;
}

.section-header::after {
  right: 0;
}

.currency-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  flex: 0 0 auto;
}

.boff-chip {
  min-width: 72px;
}

.boff-chip--hybrid {
  box-shadow:
    inset 3px 0 0 var(--boff-career),
    inset -3px 0 0 var(--boff-spec);
}

.ability-line,
.trait-block__name,
.trait-block__short {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ability-line {
  padding: 2px 0;
  font-size: 0.88rem;
}

.trait-block + .trait-block {
  margin-top: 10px;
}

.trait-block__name {
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}

.trait-block__name:hover {
  color: rgb(var(--v-theme-primary));
}

.grant-link {
  display: block;
  margin-bottom: 10px;
  text-decoration: none;
  color: inherit;
}

.grant-link:hover .grant-link__name {
  color: rgb(var(--v-theme-primary));
}

.grant-link__label,
.grant-flag {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.grant-link__name {
  font-weight: 600;
  line-height: 1.3;
}

.grant-flag {
  margin-bottom: 10px;
}

.trait-block__short {
  font-size: 0.8rem;
}

.admiralty-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 4px;
}

.admiralty-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.admiralty-row__value {
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 960px) {
  .hero-image {
    max-width: 100%;
    height: min(360px, 40vh);
  }
}
</style>
