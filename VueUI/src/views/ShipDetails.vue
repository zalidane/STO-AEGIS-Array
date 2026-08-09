<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import { useQuery } from "@vue/apollo-composable";
import { ShipDocument, type ShipQuery } from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import { formatYesNo } from "@/utils/formatters";
import { formatFactionsByFacSort } from "@/utils/sortFactionsByFacSort";

const route = useRoute();

const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(ShipDocument, () => ({
  id: id.value,
}));

type ShipDetail = NonNullable<ShipQuery["ship"]>;

const ship = computed<ShipDetail | null>(() => result.value?.ship ?? null);

function getShipImageUrl(imageField: string) {
  const filename = imageField.replace("File:", "").replaceAll(" ", "_");
  const path = `/images/ships/${filename}`;
  console.log(path);
  return path;
}
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="ship?.name" />
    <loading-panel v-if="loading" :message="'Ship Details'" />

    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="ship">
      <v-row>
        <v-col cols="12" md="8">
          <h3>{{ ship.name }}</h3>
          <h5>Tier {{ ship.tier }} • {{ ship.type }}</h5>
          <h5>{{ formatFactionsByFacSort(ship.faction, ship.facSort) }}</h5>

          <v-card color="surface" rounded="xl" class="mb-4">
            <v-sheet height="150" class="d-flex align-center justify-center">
              <v-img v-if="ship.image" :src="getShipImageUrl(ship.image)" />
              <span v-else>No Image Available</span>
            </v-sheet>
          </v-card>
        </v-col>

        <v-card>
          <v-card-title>
            <v-icon class="mr-2"> mdi-shield </v-icon>
            Combat Statistics
          </v-card-title>

          <v-list>
            <v-list-item>
              <template #prepend> Hull </template>
              <template #append>
                {{ ship.hull }}
              </template>
            </v-list-item>

            <v-list-item>
              <template #prepend> Hull | Shield Modifiers </template>
              <template #append>
                {{ ship.hullMod }} | {{ ship.shieldMod }}
              </template>
            </v-list-item>

            <v-list-item>
              <template #prepend> Turn Rate </template>
              <template #append>
                {{ ship.turnRate }}
              </template>
            </v-list-item>

            <v-list-item>
              <template #prepend> Impulse Modifier </template>
              <template #append>
                {{ ship.impulse }}
              </template>
            </v-list-item>

            <v-list-item>
              <template #prepend> Inertia Rating </template>
              <template #append>
                {{ ship.inertia }}
              </template>
            </v-list-item>

            <v-list-item>
              <template #prepend> Bonus Power </template>
              <template #append>
                <v-badge v-if="ship.powerAll">
                  All: {{ ship.powerAll }}
                </v-badge>

                <v-badge v-if="ship.powerAuxiliary">
                  A: {{ ship.powerAuxiliary }}
                </v-badge>

                <v-badge v-if="ship.powerEngines">
                  E: {{ ship.powerEngines }}
                </v-badge>

                <v-badge v-if="ship.powerShields">
                  S: {{ ship.powerShields }}
                </v-badge>

                <v-badge v-if="ship.powerWeapons">
                  W: {{ ship.powerWeapons }}
                </v-badge>
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card>
          <v-card-title>
            <v-icon class="mr-2"> mdi-account-box </v-icon>
            Bridge Officers and Consoles
          </v-card-title>

          <v-list>
            <!-- TODO: sort by length, desc></TODO -->
            <v-list-item v-for="b in ship.boffs?.split(',').sort()">
              <template #append>
                {{ b }}
              </template>
            </v-list-item>

            <v-list-item>
              <template #append>
                Eng: {{ ship.engineeringSlots }} | Sci:
                {{ ship.scienceSlots }} | Tac: {{ ship.tacticalSlots }} | T5U:
                {{ ship.t5uConsole }}
              </template>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card>
          <v-card-title>
            <v-icon class="mr-2"> mdi-explosion </v-icon>
            Weapon Hardpoints
          </v-card-title>

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

        <v-card color="surface" rounded="xl">
          <v-card-title>
            <v-icon class="mr-2"> mdi-wrench </v-icon>
            Equipment and Abilities
          </v-card-title>

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

        <v-card color="surface" rounded="xl" class="mt-4">
          <v-card-title>
            <v-icon class="mr-2">mdi-star</v-icon>
            Starship Traits
          </v-card-title>

          <v-list>
            <v-list-item v-for="trait in ship.starshipTraits" :key="trait.id">
              <v-list-item-title>
                {{ trait.name }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ trait.short }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>

        <v-col cols="12" md="8">
          <v-card>
            <v-card-title> Miscellaneous Stats </v-card-title>

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
