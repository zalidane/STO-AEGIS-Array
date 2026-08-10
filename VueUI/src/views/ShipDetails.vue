<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

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

const route = useRoute();

const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(ShipDocument, () => ({
  id: id.value,
}));

type ShipDetail = NonNullable<ShipQuery["ship"]>;

const ship = computed<ShipDetail | null>(() => result.value?.ship ?? null);

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
  <v-container>
    <AppBreadcrumbs :title="ship?.name" />
    <loading-panel v-if="loading" :message="'Ship Details'" />

    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="ship">
      <v-row>
        <v-col md="9">
          <v-card color="surface" rounded="xl" class="mb-4">
            <v-card-text>
              <v-row align="stretch" class="mb-4">
                <v-col cols="8" class="d-flex flex-column justify-center">
                  <div class="ship-title font-weight-light">
                    {{ ship.name }}
                  </div>
                </v-col>

                <v-col
                  cols="4"
                  class="d-flex flex-column justify-space-between align-end"
                  style="min-height: 140px"
                >
                  <div class="d-flex justify-end flex-wrap ga-1">
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

                  <div class="d-flex ga-2">
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

        <v-col md="3">
          <v-card rounded="xl" height="365" class="glass-panel">
            <v-card-title class="text-primary">
              <v-icon class="mr-2">mdi-shield</v-icon>
              Combat Statistics
            </v-card-title>

            <v-divider />

            <div class="px-4 py-3">
              <div class="d-flex justify-space-between py-1">
                <span>Hull</span>
                <span>{{ ship.hull?.toLocaleString() }}</span>
              </div>

              <div class="d-flex justify-space-between py-1">
                <span>Hull Mod</span>
                <span>{{ ship.hullMod }}</span>
              </div>

              <div class="d-flex justify-space-between py-1">
                <span>Shield Mod</span>
                <span>{{ ship.shieldMod }}</span>
              </div>
            </div>

            <v-list>
              <v-row class="px-4 mb-2">
                <v-col cols="6">
                  <div
                    class="section-header text-medium-emphasis text-uppercase text-caption"
                  >
                    <span>Speed</span>
                  </div>

                  <v-list density="compact">
                    <v-list-item>
                      <template #prepend>Turn Rate</template>
                      <template #append>
                        {{ ship.turnRate }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>Inertia</template>
                      <template #append>
                        {{ ship.inertia }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>Impulse</template>
                      <template #append>
                        {{ ship.impulse }}
                      </template>
                    </v-list-item>
                  </v-list>
                </v-col>

                <v-col cols="6">
                  <div
                    class="section-header text-medium-emphasis text-uppercase text-caption"
                  >
                    <span>Power</span>
                  </div>

                  <v-list density="compact">
                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="error">
                          mdi-crosshairs
                        </v-icon>
                      </template>

                      <template #title>Weapons</template>

                      <template #append>
                        {{ powerDisplay.weapons ?? "—" }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="info">mdi-shield</v-icon>
                      </template>

                      <template #title>Shields</template>

                      <template #append>
                        {{ powerDisplay.shields ?? "—" }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="warning">
                          mdi-rocket-launch
                        </v-icon>
                      </template>

                      <template #title>Engines</template>

                      <template #append>
                        {{ powerDisplay.engines ?? "—" }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="dominion">
                          mdi-auto-fix
                        </v-icon>
                      </template>

                      <template #title>Auxiliary</template>

                      <template #append>
                        {{ powerDisplay.auxiliary ?? "—" }}
                      </template>
                    </v-list-item>
                  </v-list>
                </v-col>
              </v-row>
            </v-list>
          </v-card>

          <v-card rounded="xl" height="325" class="mt-4 glass-panel">
            <v-card-title class="text-miracle">
              <v-icon class="mr-2">mdi-store</v-icon>
              Acquisition
            </v-card-title>

            <v-divider />

            <v-list>
              <v-list-item
                v-for="cost in parsedCosts"
                :key="`${cost.currencyCode}-${cost.amount}`"
              >
                <span
                  class="currency-dot"
                  :style="{ borderColor: cost.color }"
                />
                {{ cost.amount }}
                {{ cost.label }}
              </v-list-item>

              <v-list-item>
                <template #prepend>Available at Level</template>
                <template #append>
                  {{ ship.rankLevel }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend>Release Date</template>
                <template #append>
                  {{ ship.released ? formatWikiDate(ship.released) : "" }}
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-row class="mt-4">
          <v-col md="3">
            <v-card rounded="xl" height="350" class="glass-panel">
              <v-card-title>
                <v-icon class="mr-2">mdi-account-box</v-icon>
                Bridge Officers and Consoles
              </v-card-title>
              <v-divider />

              <v-card-text>
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
              </v-card-text>

              <div
                class="section-header text-medium-emphasis text-uppercase text-caption"
              >
                <span>Consoles</span>
              </div>
              <div class="d-flex justify-center ga-2 mt-3">
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
            </v-card>
          </v-col>

          <v-col md="2">
            <v-card rounded="xl" height="350" class="glass-panel">
              <v-card-title>
                <v-icon class="mr-2">mdi-explosion</v-icon>
                Weapon Hardpoints
              </v-card-title>
              <v-divider />

              <v-list-item>
                <template #prepend>Fore Weapons</template>
                <template #append>
                  {{ ship.foreWeapons }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend>Aft Weapons</template>
                <template #append>
                  {{ ship.aftWeapons }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend>Type-Specific Slot</template>
                <template #append>
                  <span v-if="ship.experimental">Experimental Weapon</span>
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend>Can Equip Cannons</template>
                <template #append>
                  {{ formatYesNo(ship.equipCannons) }}
                </template>
              </v-list-item>
            </v-card>
          </v-col>

          <v-col md="2">
            <v-card rounded="xl" height="350" class="glass-panel">
              <v-card-title class="text-secondary">
                <v-icon class="mr-2">mdi-wrench</v-icon>
                Equipment and Abilities
              </v-card-title>
              <v-divider />

              <v-list>
                <template v-if="ship.abilities">
                  <v-list-item
                    v-for="ability in ship.abilities.split(',')"
                    :key="ability"
                  >
                    {{ ability }}
                  </v-list-item>
                </template>

                <v-list-item>
                  <template #prepend>Device Slots</template>
                  <template #append>
                    {{ ship.devices }}
                  </template>
                </v-list-item>

                <v-list-item>
                  <template #prepend>Hangars</template>
                  <template #append>
                    <span>{{ ship.hangars ?? 0 }}</span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <template #prepend>Secondary Deflector</template>
                  <template #append>
                    {{ formatYesNo(ship.secondaryDeflector) }}
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <v-col md="3">
            <v-card rounded="xl" height="350" class="glass-panel">
              <v-card-title class="text-dominion">
                <v-icon class="mr-2">mdi-star</v-icon>
                Starship Traits
              </v-card-title>
              <v-divider />

              <v-list>
                <v-list-item
                  v-for="trait in ship.starshipTraits"
                  :key="trait.id"
                >
                  <v-list-item-title>
                    {{ trait.name }}
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    {{ trait.short }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <v-col md="2">
            <v-card rounded="xl" height="350" class="glass-panel">
              <v-card-title>
                <v-icon class="mr-2">mdi-card-account-details</v-icon>
                Admiralty
              </v-card-title>
              <v-divider />

              <v-list class="px-2 pt-4" lines="one">
                <v-list-item>
                  <template #prepend>
                    <v-avatar color="engineering" variant="tonal" size="40">
                      <v-icon color="engineering" icon="mdi-wrench" />
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-engineering font-weight-bold">
                    Engineering
                  </v-list-item-title>
                  <template #append>
                    <span class="text-h5 text-engineering font-weight-bold">
                      {{ ship.admiraltyEng ?? "—" }}
                    </span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-avatar color="tactical" variant="tonal" size="40">
                      <v-icon color="tactical" icon="mdi-crosshairs" />
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-tactical font-weight-bold">
                    Tactical
                  </v-list-item-title>
                  <template #append>
                    <span class="text-h5 text-tactical font-weight-bold">
                      {{ ship.admiraltyTac ?? "—" }}
                    </span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <template #prepend>
                    <v-avatar color="science" variant="tonal" size="40">
                      <v-icon color="science" icon="mdi-flask" />
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-science font-weight-bold">
                    Science
                  </v-list-item-title>
                  <template #append>
                    <span class="text-h5 text-science font-weight-bold">
                      {{ ship.admiraltySci ?? "—" }}
                    </span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-row>
    </template>

    <v-alert v-else type="warning">Ship not found</v-alert>
  </v-container>
</template>

<style scoped>
.ship-title {
  font-size: 3rem;
  line-height: 1.1;
}

.hero-image {
  height: 500px;
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
  width: 35%;
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-right: 12px;
}

.boff-chip {
  min-width: 90px;
}

.boff-chip--hybrid {
  box-shadow:
    inset 3px 0 0 var(--boff-career),
    inset -3px 0 0 var(--boff-spec);
}
</style>
