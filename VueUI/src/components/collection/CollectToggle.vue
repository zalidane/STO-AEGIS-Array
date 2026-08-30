<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCollectionStore } from "@/stores/collection";
import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { bindScopeLabel } from "@/logic/collection/bind";
import {
  bindChoiceFromCost,
  FALLBACK_BIND_CHOICE_PROMPT,
} from "@/logic/collection/bindChoice";
import CaptainIdentityFields from "@/components/collection/CaptainIdentityFields.vue";
import {
  isCompleteIdentity,
  type CaptainCareer,
} from "@/logic/captain/identity";

const props = defineProps<{
  kind: CatalogKind;
  catalogId: number;
  bind: BindScope;
  /** Dual-path / expensive Zen / Phoenix hulls (and their grants) offer a bind choice. */
  allowAccountUnlock?: boolean;
  /** Wiki cost string; used to compose the bind-choice dialog from matching conditions. */
  cost?: string | null;
  displayPrefix?: string | null;
  hullName?: string | null;
  /** Override dialog copy when cost is not available (catalog lists, grants). */
  bindChoicePrompt?: string;
  /** Icon-sized control for cards and list rows; hides bind caption. */
  compact?: boolean;
}>();

const store = useCollectionStore();
const { activeCharacter } = storeToRefs(store);

const createOpen = ref(false);
const bindOpen = ref(false);
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

const storedBind = computed(() =>
  store.bindForActive(props.kind, props.catalogId),
);

const effectiveBind = computed(
  () => storedBind.value ?? props.bind,
);

const status = computed(() =>
  store.statusFor(props.kind, props.catalogId, effectiveBind.value),
);

const otherLabel = computed(() => {
  const names = status.value.otherAccountCopies.map((copy) => copy.characterName);
  if (names.length === 0) return "";
  return `On ${names.join(", ")}`;
});

const createError = computed(() => {
  const name = draftName.value.trim();
  if (!name) return "Name is required.";
  if (
    !isCompleteIdentity({
      career: draftIdentity.value.career || undefined,
      faction: draftIdentity.value.faction,
      race: draftIdentity.value.race,
    })
  ) {
    return "Class, faction, and race are required.";
  }
  return "";
});

function toggle() {
  if (!activeCharacter.value) {
    draftName.value = "";
    draftIdentity.value = { career: "", faction: "", race: "" };
    createOpen.value = true;
    return;
  }
  if (status.value.ownedByActive) {
    store.uncollect(props.kind, props.catalogId);
    return;
  }
  if (props.allowAccountUnlock) {
    bindOpen.value = true;
    return;
  }
  store.collect(props.kind, props.catalogId, props.bind);
}

function submitCreate() {
  if (createError.value) return;
  store.addCharacter({
    name: draftName.value,
    career: draftIdentity.value.career as CaptainCareer,
    faction: draftIdentity.value.faction,
    race: draftIdentity.value.race,
  });
  createOpen.value = false;
  if (props.allowAccountUnlock) {
    bindOpen.value = true;
    return;
  }
  store.collect(props.kind, props.catalogId, props.bind);
}

function chooseBind(bind: BindScope) {
  if (status.value.ownedByActive) {
    store.setBind(props.kind, props.catalogId, bind);
  } else {
    store.collect(props.kind, props.catalogId, bind);
  }
  bindOpen.value = false;
}

function openBindPicker() {
  bindOpen.value = true;
}

const dialogPrompt = computed(() => {
  if (props.bindChoicePrompt?.trim()) return props.bindChoicePrompt.trim();
  const fromCost = bindChoiceFromCost(props.cost, {
    displayPrefix: props.displayPrefix,
    name: props.hullName,
  }).prompt;
  if (fromCost) return fromCost;
  return FALLBACK_BIND_CHOICE_PROMPT;
});
</script>

<template>
  <div
    class="collect-toggle"
    :class="{ 'collect-toggle--compact': compact }"
    @click.stop
    @mousedown.stop
  >
    <v-btn
      :size="compact ? 'x-small' : 'small'"
      :variant="status.ownedByActive ? 'flat' : 'outlined'"
      :color="status.ownedByActive ? 'primary' : undefined"
      :prepend-icon="status.ownedByActive ? 'mdi-bookmark' : 'mdi-bookmark-outline'"
      @click="toggle"
    >
      {{ status.ownedByActive ? "Collected" : "Collect" }}
    </v-btn>
    <div v-if="!compact" class="collect-toggle__meta">
      <button
        v-if="allowAccountUnlock"
        type="button"
        class="collect-toggle__bind collect-toggle__bind--choice"
        @click="openBindPicker"
      >
        {{
          effectiveBind === "account"
            ? "Unlocked for account"
            : allowAccountUnlock
              ? "Bound to this captain"
              : bindScopeLabel(effectiveBind)
        }}
      </button>
      <span v-else class="collect-toggle__bind">{{ bindScopeLabel(effectiveBind) }}</span>
      <span v-if="otherLabel" class="collect-toggle__others">{{ otherLabel }}</span>
    </div>

    <v-dialog v-model="createOpen" max-width="460">
      <v-card>
        <v-card-title>Create a captain first</v-card-title>
        <v-card-text>
          Collected items are stored in a captain folder on this device.
          <v-text-field
            v-model="draftName"
            class="mt-4"
            label="Captain name"
            autofocus
            @keydown.enter="submitCreate"
          />
          <CaptainIdentityFields v-model:identity="draftIdentity" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createOpen = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="Boolean(createError)" @click="submitCreate">
            Create and collect
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="bindOpen" max-width="460">
      <v-card>
        <v-card-title>How did you unlock this?</v-card-title>
        <v-card-text>{{ dialogPrompt }}</v-card-text>
        <v-card-actions class="flex-wrap ga-2 pa-4">
          <v-btn
            color="primary"
            variant="flat"
            @click="chooseBind('account')"
          >
            Unlocked for account
          </v-btn>
          <v-btn variant="outlined" @click="chooseBind('character')">
            Bound to this captain
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.collect-toggle {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.collect-toggle--compact {
  align-items: stretch;
}

.collect-toggle__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.collect-toggle__bind--choice {
  padding: 0;
  border: 0;
  background: transparent;
  color: #7dd3fc;
  cursor: pointer;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.collect-toggle__others {
  color: #7dd3fc;
}
</style>
