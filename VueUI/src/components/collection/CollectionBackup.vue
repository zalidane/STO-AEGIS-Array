<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCollectionStore } from "@/stores/collection";
import {
  collectionBackupFileError,
  collectionBackupFilename,
  formatCollectionBackupSummary,
  parseCollectionBackupJson,
  summarizeCollection,
  type ParsedCollectionBackup,
} from "@/logic/collection/backup";

const store = useCollectionStore();
const { state } = storeToRefs(store);

const fileInput = ref<HTMLInputElement | null>(null);
const error = ref("");
const busy = ref(false);
const confirmOpen = ref(false);
const pending = ref<ParsedCollectionBackup | null>(null);
const pendingSummary = ref("");

const currentSummary = computed(() =>
  formatCollectionBackupSummary(summarizeCollection(state.value)),
);

const hasCurrentCollection = computed(
  () =>
    state.value.accounts.length > 0 ||
    state.value.characters.length > 0 ||
    state.value.entries.length > 0 ||
    state.value.loadouts.length > 0,
);

function downloadBackup() {
  error.value = "";
  const exportedAt = new Date().toISOString();
  const text = store.exportCollectionBackup(exportedAt);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = collectionBackupFilename(exportedAt);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openPicker() {
  error.value = "";
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  busy.value = true;
  error.value = "";
  pending.value = null;
  try {
    pending.value = parseCollectionBackupJson(await file.text());
    pendingSummary.value = formatCollectionBackupSummary(
      summarizeCollection(pending.value.state),
    );
    confirmOpen.value = true;
  } catch (err) {
    error.value = collectionBackupFileError(err);
  } finally {
    input.value = "";
    busy.value = false;
  }
}

function cancelRestore() {
  confirmOpen.value = false;
  pending.value = null;
}

function confirmRestore() {
  if (!pending.value) return;
  try {
    store.replaceCollection(pending.value.state);
    confirmOpen.value = false;
    pending.value = null;
    error.value = "";
  } catch (err) {
    error.value = collectionBackupFileError(err);
    confirmOpen.value = false;
  }
}
</script>

<template>
  <div class="collection-backup">
    <input
      ref="fileInput"
      class="collection-backup__file"
      type="file"
      accept=".json,application/json"
      @change="onFileChange"
    />
    <v-btn
      size="small"
      variant="outlined"
      color="primary"
      prepend-icon="mdi-download"
      @click="downloadBackup"
    >
      Backup JSON
    </v-btn>
    <v-btn
      size="small"
      variant="outlined"
      color="primary"
      prepend-icon="mdi-upload"
      :loading="busy"
      @click="openPicker"
    >
      Restore JSON
    </v-btn>

    <v-alert
      v-if="error"
      class="collection-backup__error"
      type="warning"
      variant="tonal"
      density="compact"
    >
      {{ error }}
    </v-alert>

    <v-dialog v-model="confirmOpen" max-width="480" persistent>
      <v-card>
        <v-card-title>Restore collection backup</v-card-title>
        <v-card-text>
          <p>
            This file has {{ pendingSummary }}. Restoring it replaces every
            account, captain, collected item, and build stored in this browser.
          </p>
          <p v-if="hasCurrentCollection">
            Current collection: {{ currentSummary }}.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelRestore">Cancel</v-btn>
          <v-btn color="error" @click="confirmRestore">Replace collection</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.collection-backup {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.collection-backup__file {
  display: none;
}

.collection-backup__error {
  flex-basis: 100%;
  margin: 0;
}
</style>
