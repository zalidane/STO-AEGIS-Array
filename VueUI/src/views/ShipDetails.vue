<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useQuery } from "@vue/apollo-composable";
import { ShipDocument, type ShipQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import { boffColors, formatWikiDate, formatYesNo } from "@/utils/formatters";
import { formatFactionsByFacSort } from "@/utils/sortFactionsByFacSort";
import { parseShipCost, type ShipCost } from "@/utils/parsers";

const route = useRoute();

const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(ShipDocument, () => ({
  id: id.value,
}));

type ShipDetail = NonNullable<ShipQuery["ship"]>;

const ship = computed<ShipDetail | null>(() => result.value?.ship ?? null);

const formattedFactions = computed(() => {
  if (!ship.value) return;

  return formatFactionsByFacSort(ship.value.faction, ship.value.facSort)
    .split(",")
    .map((f) => f.trim());
});

const factionGlow = computed(() => {
  const primaryFaction = formattedFactions.value?.[0] ?? "";

  if (primaryFaction.startsWith("United")) {
    return "#3fa7ff";
  }
  if (primaryFaction.startsWith("Klingon")) {
    return "#ff4d4d";
  }
  if (primaryFaction.startsWith("Romulan")) {
    return "#00cc66";
  }

  return "#9966ff";
});

function getFactionColor(faction: string): string {
  if (faction.includes("Federation")) {
    return "federation";
  }

  if (faction.includes("Klingon")) {
    return "klingon";
  }

  if (faction.includes("Romulan")) {
    return "romulan";
  }

  if (faction.includes("Dominion")) {
    return "dominion";
  }

  return "neutral";
}

function getBoffColor(boff: string): string {
  if (boff.includes("Tactical")) {
    return "tactical";
  }

  if (boff.includes("Engineering")) {
    return "engineering";
  }

  if (boff.includes("Science")) {
    return "science";
  }

  if (boff.includes("Universal")) {
    return "universal";
  }

  return "neutral";
}

function abbreviateBoff(boff: string): string {
  return boff
    .replace("Lieutenant Commander", "LtCmdr")
    .replace("Commander", "Cmdr")
    .replace("Lieutenant", "Lt")
    .replace("Engineering", "ENG")
    .replace("Science", "SCI")
    .replace("Tactical", "TAC")
    .replace("Universal", "UNI")
    .replace("Intel", "INT")
    .replace("Command", "CMD")
    .replace("Pilot", "PIL")
    .replace("Miracle Worker", "MW")
    .replace("Temporal", "TMP");
}

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

const fallbackImage = "/images/ships/galaxy-class-angled.jfif";
const imageFailed = ref(false);
const imageUrl = computed(() => {
  if (imageFailed.value || !ship.value?.image) {
    return fallbackImage;
  }

  return getShipImageUrl(ship.value.image);
});
function getShipImageUrl(imageField: string) {
  const filename = imageField.replace("File:", "").replaceAll(" ", "_");
  const path = `/images/ships/${filename}`;
  console.log(path);
  return path;
}

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
          <v-card color="surface" rounded="x1" class="mb-4">
            <v-card-text>
              <v-row align="stretch" class="mb-4">
                <v-col cols="8" class="d-flex flex-column justify-center">
                  <div class="ship-title">
                    {{ ship.name }}
                  </div>
                </v-col>

                <v-col
                  cols="4"
                  class="hero-meta d-flex flex-column justify-space-between align-end"
                >
                  <div class="faction-container">
                    <v-chip
                      v-for="faction in formattedFactions"
                      :key="faction"
                      :color="getFactionColor(faction)"
                      size="small"
                      variant="outlined"
                      class="ma-1"
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
          <v-card rounded="xl" height="365" class="glass-title">
            <v-card-title class="header-cyan">
              <v-icon class="mr-2"> mdi-shield </v-icon>
              Combat Statistics
            </v-card-title>

            <v-divider />

            <div class="combat-summary">
              <div class="summary-row">
                <span>Hull</span>
                <span>{{ ship.hull?.toLocaleString() }}</span>
              </div>

              <div class="summary-row">
                <span>Hull Mod</span>
                <span>{{ ship.hullMod }}</span>
              </div>

              <div class="summary-row">
                <span>Shield Mod</span>
                <span>{{ ship.shieldMod }}</span>
              </div>
            </div>
            <v-list>
              <v-row class="px-4 mb-2">
                <v-col cols="6">
                  <div class="section-header">
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
                  <div class="section-header">
                    <span>Power</span>
                  </div>

                  <v-list density="compact">
                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="red">
                          mdi-crosshairs
                        </v-icon>
                      </template>

                      <template #title> Weapons </template>

                      <template #append>
                        {{ powerDisplay.weapons ?? "—" }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="blue"> mdi-shield </v-icon>
                      </template>

                      <template #title> Shields </template>

                      <template #append>
                        {{ powerDisplay.shields ?? "—" }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="yellow">
                          mdi-rocket-launch
                        </v-icon>
                      </template>

                      <template #title> Engines </template>

                      <template #append>
                        {{ powerDisplay.engines ?? "—" }}
                      </template>
                    </v-list-item>

                    <v-list-item>
                      <template #prepend>
                        <v-icon size="small" color="purple">
                          mdi-auto-fix
                        </v-icon>
                      </template>

                      <template #title> Auxiliary </template>

                      <template #append>
                        {{ powerDisplay.auxiliary ?? "—" }}
                      </template>
                    </v-list-item>
                  </v-list>
                </v-col>
              </v-row>
            </v-list>
          </v-card>

          <v-card rounded="xl" height="325" class="mt-4 glass-title">
            <v-card-title class="header-green">
              <v-icon class="mr-2"> mdi-store </v-icon>
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
                  :style="{
                    borderColor: cost.color,
                  }"
                ></span>
                {{ cost.amount }}
                {{ cost.label }}
                <!-- <v-divider class="or-separator" v-if="index < cost.length - 1">
                  OR
                </v-divider> -->
              </v-list-item>

              <v-list-item>
                <template #prepend>Available at Level</template>
                <template #append>
                  {{ ship.rankLevel }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Release Date </template>
                <template #append>
                  {{ ship.released ? formatWikiDate(ship.released) : "" }}
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <v-row class="mt-4">
          <v-col md="3">
            <v-card rounded="xl" height="350" class="glass-title">
              <v-card-title>
                <v-icon class="mr-2"> mdi-account-box </v-icon>
                Bridge Officers and Consoles
              </v-card-title>
              <v-divider />

              <v-card-text>
                <div class="boff-layout">
                  <v-chip
                    v-for="boff in ship.boffs?.split(',').sort()"
                    :key="boff"
                    class="boff-chip"
                    size="small"
                    variant="outlined"
                    :color="getBoffColor(boff)"
                  >
                    {{ abbreviateBoff(boff) }}
                  </v-chip>
                </div>
              </v-card-text>

              <div class="section-header">
                <span>Consoles</span>
              </div>
              <div class="console-summary">
                <v-chip size="small" color="warning">
                  ENG {{ ship.engineeringSlots }}
                </v-chip>

                <v-chip size="small" color="info">
                  SCI {{ ship.scienceSlots }}
                </v-chip>

                <v-chip size="small" color="error">
                  TAC {{ ship.tacticalSlots }}
                </v-chip>
              </div>
            </v-card>
          </v-col>

          <v-col md="2">
            <v-card rounded="xl" height="350" class="glass-title">
              <v-card-title>
                <v-icon class="mr-2"> mdi-explosion </v-icon>
                Weapon Hardpoints
              </v-card-title>
              <v-divider />

              <v-list-item>
                <template #prepend> Fore Weapons </template>
                <template #append>
                  {{ ship.foreWeapons }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Aft Weapons </template>
                <template #append>
                  {{ ship.aftWeapons }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Type-Specific Slot </template>
                <template #append>
                  <span v-if="ship.experimental">Experimental Weapon</span>
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Can Equip Cannons </template>
                <template #append>
                  {{ formatYesNo(ship.equipCannons) }}
                </template>
              </v-list-item>
            </v-card>
          </v-col>

          <v-col md="2">
            <v-card rounded="xl" height="350" class="glass-title">
              <v-card-title class="header-orange">
                <v-icon class="mr-2"> mdi-wrench </v-icon>
                Equipment and Abilities
              </v-card-title>
              <v-divider />

              <v-list>
                <template v-if="ship.abilities">
                  <v-list-item v-for="ability in ship.abilities.split(',')">
                    {{ ability }}
                  </v-list-item>
                </template>

                <v-list-item>
                  <template #prepend> Device Slots </template>
                  <template #append>
                    {{ ship.devices }}
                  </template>
                </v-list-item>

                <v-list-item>
                  <template #prepend> Hangars </template>
                  <template #append>
                    <span v-if="ship.hangars"> {{ ship.hangars }}</span>
                    <span v-else>0</span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <template #prepend> Secondary Deflector </template>
                  <template #append>
                    {{ formatYesNo(ship.secondaryDeflector) }}
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <v-col md="5">
            <v-card rounded="xl" height="350" class="glass-title">
              <v-card-title class="header-purple">
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
        </v-row>

        <v-col cols="12" md="8">
          <v-card>
            <v-card-title> Miscellaneous Stats </v-card-title>
            <v-divider />

            <v-list>
              <v-list-item>
                <template #prepend> Warp Core </template>
                <template #append> ??? </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Cost </template>
                <template #append>
                  {{ ship.cost }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Admiralty Stats </template>
                <template #append>
                  Eng: {{ ship.admiraltyEng }} Tac: {{ ship.admiraltyTac }} Sci:
                  {{ ship.admiraltySci }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Internal Name </template>
                <template #append>
                  {{ ship.internalName }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Rank Level </template>
                <template #append>
                  {{ ship.rankLevel }}
                </template>
              </v-list-item>

              <v-list-item>
                <template #prepend> Released </template>
                <template #append>
                  {{ ship.released }}
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <v-alert v-else type="warning"> Ship not found </v-alert>
  </v-container>
</template>

<style scoped>
.hero-meta {
  min-height: 140px;
}

.hero-image {
  height: 500px;
  max-width: 75%;
  margin: 0 auto;

  background:
    radial-gradient(
      ellipse at center,
      rgba(0, 180, 255, 0.25) 0%,
      rgba(0, 180, 255, 0.08) 40%,
      transparent 75%
    ),
    linear-gradient(135deg, #102338, #162e4c, #0d1625);

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

.header-cyan {
  color: #00d4ff;
}

.header-orange {
  color: #ff9838;
}

.header-purple {
  color: #9966ff;
}

.header-green {
  color: #00d26a;
}

.ship-title {
  font-size: 3.5rem;
  font-weight: 300;
  line-height: 1.1;
}

.faction-container {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 100%;
}

.power-weapons {
  background-color: #b3261e;
}

.power-shields {
  background-color: #1565c0;
}

.power-engines {
  background-color: #c49000;
}

.power-aux {
  background-color: #673ab7;
}

.or-separator {
  opacity: 0.6;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.glass-title {
  background: rgba(18, 32, 55, 0.85);
  backdrop-filter: blue(10px);
}

.section-header {
  position: relative;
  text-align: center;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-header::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 35%;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.section-header::after {
  content: "";
  position: absolute;
  right: 0;
  top: 50%;
  width: 35%;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.section-caption {
  color: rgba(255, 255, 255, 0.65);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.08rem;
  margin-bottom: 0.5rem;
}

.combat-summary {
  padding: 12px 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.currency-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-right: 12px;
}

.boff-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.boff-chip {
  min-width: 90px;
  justify-content: center;
  font-weight: 600;
}

.console-summary {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
</style>
