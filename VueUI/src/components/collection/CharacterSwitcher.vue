<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCollectionStore } from "@/stores/collection";
import CaptainIdentityFields from "@/components/collection/CaptainIdentityFields.vue";
import {
  isCompleteIdentity,
  type CaptainCareer,
} from "@/logic/captain/identity";

const store = useCollectionStore();
const { characters, activeCharacter, activeCharacterId } = storeToRefs(store);

const menuOpen = ref(false);
const createOpen = ref(false);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const draftName = ref("");
const draftIdentity = ref<{
  career: CaptainCareer | "";
  faction: string;
  race: string;
}>({
  career: "",
  faction: "",
  race: "",
});

const nameError = computed(() => {
  const name = draftName.value.trim();
  if (!name) return "Name is required.";
  const taken = characters.value.some(
    (character) =>
      character.name.toLowerCase() === name.toLowerCase() &&
      (renameOpen.value ? character.id !== activeCharacterId.value : true),
  );
  if (taken) return "A captain with that name already exists.";
  return "";
});

const identityReady = computed(() =>
  isCompleteIdentity({
    career: draftIdentity.value.career || undefined,
    faction: draftIdentity.value.faction,
    race: draftIdentity.value.race,
  }),
);

const createError = computed(() => {
  if (nameError.value) return nameError.value;
  if (!identityReady.value) return "Class, faction, and race are required.";
  return "";
});

function resetIdentity() {
  draftIdentity.value = { career: "", faction: "", race: "" };
}

function openCreate() {
  draftName.value = "";
  resetIdentity();
  createOpen.value = true;
}

function openRename() {
  draftName.value = activeCharacter.value?.name ?? "";
  draftIdentity.value = {
    career: activeCharacter.value?.career ?? "",
    faction: activeCharacter.value?.faction ?? "",
    race: activeCharacter.value?.race ?? "",
  };
  renameOpen.value = true;
}

function submitCreate() {
  if (createError.value || !identityReady.value) return;
  store.addCharacter({
    name: draftName.value,
    career: draftIdentity.value.career as CaptainCareer,
    faction: draftIdentity.value.faction,
    race: draftIdentity.value.race,
  });
  createOpen.value = false;
}

function submitRename() {
  if (!activeCharacterId.value || nameError.value || !identityReady.value) return;
  store.updateCharacterIdentity(activeCharacterId.value, {
    name: draftName.value,
    career: draftIdentity.value.career as CaptainCareer,
    faction: draftIdentity.value.faction,
    race: draftIdentity.value.race,
  });
  renameOpen.value = false;
}

function submitDelete() {
  if (!activeCharacterId.value) return;
  store.removeCharacter(activeCharacterId.value);
  deleteOpen.value = false;
}
</script>

<template>
  <div class="character-switcher">
    <v-menu v-model="menuOpen" location="bottom end">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          variant="text"
          prepend-icon="mdi-account"
          append-icon="mdi-chevron-down"
        >
          {{ activeCharacter?.name ?? "No captain" }}
        </v-btn>
      </template>

      <v-list density="compact" min-width="220">
        <v-list-item
          v-for="character in characters"
          :key="character.id"
          :active="character.id === activeCharacterId"
          :title="character.name"
          @click="store.selectCharacter(character.id)"
        />
        <v-divider v-if="characters.length" />
        <v-list-item
          title="New captain"
          prepend-icon="mdi-plus"
          @click="openCreate"
        />
        <v-list-item
          title="Edit captain"
          prepend-icon="mdi-pencil"
          :disabled="!activeCharacter"
          @click="openRename"
        />
        <v-list-item
          title="Delete captain"
          prepend-icon="mdi-delete-outline"
          :disabled="!activeCharacter"
          @click="deleteOpen = true"
        />
      </v-list>
    </v-menu>

    <v-dialog v-model="createOpen" max-width="460">
      <v-card>
        <v-card-title>New captain</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="draftName"
            label="Name"
            autofocus
            :error-messages="draftName.trim() ? nameError : ''"
            @keydown.enter="submitCreate"
          />
          <CaptainIdentityFields v-model:identity="draftIdentity" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createOpen = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="Boolean(createError)" @click="submitCreate">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameOpen" max-width="460">
      <v-card>
        <v-card-title>Edit captain</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="draftName"
            label="Name"
            autofocus
            :error-messages="draftName.trim() ? nameError : ''"
            @keydown.enter="submitRename"
          />
          <CaptainIdentityFields v-model:identity="draftIdentity" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="renameOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="Boolean(nameError) || !identityReady"
            @click="submitRename"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card>
        <v-card-title>Delete captain</v-card-title>
        <v-card-text>
          Delete {{ activeCharacter?.name }} and their collected items? Bound-to-account
          copies on other captains are kept.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteOpen = false">Cancel</v-btn>
          <v-btn color="error" @click="submitDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
