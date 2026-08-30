<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMutation } from "@vue/apollo-composable";
import {
  PublishBuildDocument,
  UnlistBuildDocument,
  UpdateBuildDocument,
} from "@/graphql/generated/graphql";
import { MIN_PUBLIC_FILLS, type SharePayload } from "@/logic/share/payload";
import { sharedBuildUrl } from "@/logic/share/records";
import { useShareStore } from "@/stores/share";

const props = defineProps<{
  open: boolean;
  loadoutId: string;
  payload: SharePayload | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const shareStore = useShareStore();
const listPublic = ref(false);
const busy = ref(false);
const error = ref("");
const listingError = ref("");
const copied = ref(false);

const record = computed(() => shareStore.forLoadout(props.loadoutId));
const fillCount = computed(() => props.payload?.slots.length ?? 0);
const canListPublic = computed(() => fillCount.value >= MIN_PUBLIC_FILLS);
const shareUrl = computed(() => {
  if (!record.value) return "";
  return sharedBuildUrl(record.value.publicCode, window.location.origin);
});

watch(
  () => [props.open, record.value?.visibility] as const,
  ([open, visibility]) => {
    if (!open) return;
    listPublic.value = visibility === "public";
    error.value = "";
    listingError.value = "";
    copied.value = false;
  },
);

const { mutate: publishMutate } = useMutation(PublishBuildDocument);
const { mutate: updateMutate } = useMutation(UpdateBuildDocument);
const { mutate: unlistMutate } = useMutation(UnlistBuildDocument);

function close() {
  emit("update:open", false);
}

async function copyLink() {
  if (!shareUrl.value) return;
  await navigator.clipboard.writeText(shareUrl.value);
  copied.value = true;
}

function rememberFromResult(input: {
  publicCode: string;
  editToken: string;
  visibility: string;
}) {
  shareStore.remember({
    loadoutId: props.loadoutId,
    publicCode: input.publicCode,
    editToken: input.editToken,
    visibility: input.visibility === "public" ? "public" : "unlisted",
    updatedAt: new Date().toISOString(),
  });
}

async function publish() {
  if (!props.payload) return;
  busy.value = true;
  error.value = "";
  listingError.value = "";
  try {
    const existing = record.value;
    if (existing) {
      const result = await updateMutate({
        publicCode: existing.publicCode,
        editToken: existing.editToken,
        payload: props.payload,
        listPublic: listPublic.value,
      });
      const data = result?.data?.updateBuild;
      if (!data) throw new Error("Update failed.");
      rememberFromResult({
        publicCode: data.build.publicCode,
        editToken: data.editToken,
        visibility: data.build.visibility,
      });
      listingError.value = data.listingError ?? "";
    } else {
      const result = await publishMutate({
        payload: props.payload,
        listPublic: listPublic.value,
      });
      const data = result?.data?.publishBuild;
      if (!data) throw new Error("Publish failed.");
      rememberFromResult({
        publicCode: data.build.publicCode,
        editToken: data.editToken,
        visibility: data.build.visibility,
      });
      listingError.value = data.listingError ?? "";
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not share this build.";
  } finally {
    busy.value = false;
  }
}

async function unlist() {
  const existing = record.value;
  if (!existing) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await unlistMutate({
      publicCode: existing.publicCode,
      editToken: existing.editToken,
    });
    const data = result?.data?.unlistBuild;
    if (!data) throw new Error("Unlist failed.");
    rememberFromResult({
      publicCode: data.publicCode,
      editToken: existing.editToken,
      visibility: data.visibility,
    });
    listPublic.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not unlist this build.";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <v-dialog :model-value="open" max-width="32rem" @update:model-value="close">
    <v-card>
      <v-card-title>Share this build</v-card-title>
      <v-card-text>
        <p class="share-copy">
          Creates an anonymous unlisted link. No account. Collection stays on
          this device.
        </p>
        <v-checkbox
          v-model="listPublic"
          :disabled="!canListPublic"
          hide-details="auto"
          label="List this build publicly"
        />
        <p v-if="!canListPublic" class="share-hint">
          Public listing needs at least {{ MIN_PUBLIC_FILLS }} seated items.
          {{ fillCount }} seated now.
        </p>
        <v-alert v-if="error" type="error" variant="tonal" class="mt-3">
          {{ error }}
        </v-alert>
        <v-alert v-if="listingError" type="warning" variant="tonal" class="mt-3">
          {{ listingError }}
        </v-alert>
        <div v-if="record" class="share-link">
          <v-text-field
            :model-value="shareUrl"
            density="compact"
            hide-details
            label="Share link"
            readonly
            variant="outlined"
          />
          <v-btn class="mt-2" variant="tonal" @click="copyLink">
            {{ copied ? "Copied" : "Copy link" }}
          </v-btn>
          <p class="share-hint">
            {{
              record.visibility === "public"
                ? "Listed publicly. Popularity counts this snapshot once."
                : "Unlisted — anyone with the link can open it."
            }}
          </p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn
          v-if="record?.visibility === 'public'"
          variant="text"
          :disabled="busy"
          @click="unlist"
        >
          Unlist
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="busy" :disabled="!payload" @click="publish">
          {{ record ? "Update link" : "Create link" }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.share-copy,
.share-hint {
  margin: 0 0 0.75rem;
  color: rgba(255, 255, 255, 0.68);
}

.share-hint {
  margin-top: 0.35rem;
  font-size: 0.85rem;
}

.share-link {
  margin-top: 1rem;
}
</style>
