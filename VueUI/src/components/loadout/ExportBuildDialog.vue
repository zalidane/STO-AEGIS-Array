<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  markdown: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const copied = ref(false);
const copyError = ref("");

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    copied.value = false;
    copyError.value = "";
  },
);

function close() {
  emit("update:open", false);
}

async function copyMarkdown() {
  copyError.value = "";
  try {
    await navigator.clipboard.writeText(props.markdown);
    copied.value = true;
  } catch {
    copied.value = false;
    copyError.value = "Could not copy. Select the text and copy it manually.";
  }
}
</script>

<template>
  <v-dialog :model-value="open" max-width="40rem" @update:model-value="close">
    <v-card>
      <v-card-title>Export for Reddit</v-card-title>
      <v-card-text>
        <p class="export-copy">
          Copies this loadout into the
          <a
            href="https://www.reddit.com/r/stobuilds/wiki/templateguide"
            target="_blank"
            rel="noreferrer"
          >r/stobuilds</a>
          markdown template. Paste it into a Reddit post in markdown mode.
        </p>
        <p class="export-hint">
          Skill tree, duty officers, and power settings are left blank — this
          builder does not track them.
        </p>
        <v-alert v-if="copyError" type="warning" variant="tonal" class="mb-3">
          {{ copyError }}
        </v-alert>
        <v-textarea
          :model-value="markdown"
          auto-grow
          class="export-preview"
          hide-details
          label="Reddit markdown"
          max-rows="18"
          readonly
          rows="12"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn color="primary" :disabled="!markdown" @click="copyMarkdown">
          {{ copied ? "Copied" : "Copy markdown" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.export-copy,
.export-hint {
  margin: 0 0 0.75rem;
  color: rgba(255, 255, 255, 0.68);
}

.export-hint {
  font-size: 0.85rem;
}

.export-preview {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
}
</style>
