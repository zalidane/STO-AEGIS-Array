<script setup lang="ts">
import { computed, watch } from "vue";
import {
  CAPTAIN_CAREERS,
  CAPTAIN_FACTIONS,
  factionById,
  type CaptainCareer,
} from "@/logic/captain/identity";

const identity = defineModel<{
  career: CaptainCareer | "";
  faction: string;
  race: string;
}>("identity", {
  required: true,
});

const races = computed(
  () => factionById(identity.value.faction)?.races ?? [],
);

watch(
  () => identity.value.faction,
  () => {
    const allowed = races.value.some((race) => race.id === identity.value.race);
    if (!allowed) identity.value = { ...identity.value, race: "" };
  },
);
</script>

<template>
  <v-select
    :model-value="identity.career || null"
    :items="[...CAPTAIN_CAREERS]"
    item-title="label"
    item-value="id"
    label="Class"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mt-2"
    @update:model-value="identity = { ...identity, career: $event ?? '' }"
  />
  <v-select
    :model-value="identity.faction || null"
    :items="[...CAPTAIN_FACTIONS]"
    item-title="label"
    item-value="id"
    label="Faction"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mt-3"
    @update:model-value="identity = { ...identity, faction: $event ?? '' }"
  />
  <v-select
    :model-value="identity.race || null"
    :items="[...races]"
    item-title="label"
    item-value="id"
    label="Race"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mt-3"
    :disabled="!identity.faction"
    @update:model-value="identity = { ...identity, race: $event ?? '' }"
  />
</template>
