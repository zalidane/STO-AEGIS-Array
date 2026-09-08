<script setup lang="ts">
import { computed, watch } from "vue";
import {
  CAPTAIN_CAREERS,
  CAPTAIN_FACTIONS,
  CAPTAIN_SPECIALIZATIONS,
  factionById,
  type CaptainIdentityDraft,
} from "@/logic/captain/identity";

const identity = defineModel<CaptainIdentityDraft>("identity", {
  required: true,
});

// Do not set menu-props.attach. Attaching the overlay into the dialog puts its
// scrim over the list items, so a pointer click closes the menu without applying
// a value. Parent dialogs are persistent, so the default body teleport is safe.

function patchIdentity(patch: Partial<CaptainIdentityDraft>) {
  identity.value = { ...identity.value, ...patch };
}

const races = computed(
  () => factionById(identity.value.faction)?.races ?? [],
);

const secondarySpecs = computed(() =>
  CAPTAIN_SPECIALIZATIONS.filter(
    (spec) => spec.id !== identity.value.primarySpecialization,
  ),
);

watch(
  () => identity.value.faction,
  () => {
    const allowed = races.value.some((race) => race.id === identity.value.race);
    if (!allowed) identity.value = { ...identity.value, race: "" };
  },
);

watch(
  () => identity.value.primarySpecialization,
  (primary) => {
    if (!primary) {
      if (identity.value.secondarySpecialization) {
        identity.value = { ...identity.value, secondarySpecialization: "" };
      }
      return;
    }
    if (identity.value.secondarySpecialization === primary) {
      identity.value = { ...identity.value, secondarySpecialization: "" };
    }
  },
);
</script>

<template>
  <v-select
    :model-value="identity.career || null"
    :items="CAPTAIN_CAREERS"
    item-title="label"
    item-value="id"
    label="Class"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mt-2"
    @update:model-value="patchIdentity({ career: $event ?? '' })"
  />
  <v-select
    :model-value="identity.faction || null"
    :items="CAPTAIN_FACTIONS"
    item-title="label"
    item-value="id"
    label="Faction"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mt-3"
    @update:model-value="patchIdentity({ faction: $event ?? '' })"
  />
  <v-select
    :model-value="identity.race || null"
    :items="races"
    item-title="label"
    item-value="id"
    label="Race"
    variant="outlined"
    density="compact"
    hide-details="auto"
    class="mt-3"
    :disabled="!identity.faction"
    @update:model-value="patchIdentity({ race: $event ?? '' })"
  />
  <v-select
    :model-value="identity.primarySpecialization || null"
    :items="CAPTAIN_SPECIALIZATIONS"
    item-title="label"
    item-value="id"
    label="Primary specialization"
    variant="outlined"
    density="compact"
    hide-details="auto"
    clearable
    class="mt-3"
    @update:model-value="patchIdentity({ primarySpecialization: $event ?? '' })"
  />
  <v-select
    :model-value="identity.secondarySpecialization || null"
    :items="secondarySpecs"
    item-title="label"
    item-value="id"
    label="Secondary specialization"
    variant="outlined"
    density="compact"
    hide-details="auto"
    clearable
    class="mt-3"
    :disabled="!identity.primarySpecialization"
    @update:model-value="patchIdentity({ secondarySpecialization: $event ?? '' })"
  />
</template>
