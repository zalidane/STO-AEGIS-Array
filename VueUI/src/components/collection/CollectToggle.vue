<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCollectionStore } from "@/stores/collection";
import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { bindScopeLabel } from "@/logic/collection/bind";

const props = defineProps<{
  kind: CatalogKind;
  catalogId: number;
  bind: BindScope;
  /** Phoenix / Anniversary pack hulls (and their grants) can be marked account-unlocked. */
  allowAccountUnlock?: boolean;
  /** Icon-sized control for cards and list rows; hides bind caption. */
  compact?: boolean;
}>();

const store = useCollectionStore();
const { activeCharacter } = storeToRefs(store);

const createOpen = ref(false);
const bindOpen = ref(false);
const draftName = ref("");

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
  return "";
});

function toggle() {
  if (!activeCharacter.value) {
    draftName.value = "";
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
  store.addCharacter(draftName.value);
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

    <v-dialog v-model="createOpen" max-width="420">
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
        <v-card-text>
          Phoenix Token and Anniversary Prize Pack ships were originally
          account unlocks. Mark this copy as unlocked for the account if you
          reclaimed it from Events; otherwise it stays bound to this captain.
        </v-card-text>
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
