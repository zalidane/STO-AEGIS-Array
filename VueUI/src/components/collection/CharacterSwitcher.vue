<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useCollectionStore } from "@/stores/collection";
import CaptainIdentityFields from "@/components/collection/CaptainIdentityFields.vue";
import {
  isCompleteIdentity,
  type CaptainCareer,
} from "@/logic/captain/identity";
import {
  accountNameTaken,
  captainNameTaken,
  isStockAccountName,
  platformIcon,
  platformLabel,
  unusedAccountName,
} from "@/logic/collection/accounts";
import {
  COLLECTION_PLATFORMS,
  type CollectionPlatform,
} from "@/logic/collection/types";

const store = useCollectionStore();
const {
  accountGroups,
  activeCharacter,
  activeCharacterId,
  activeAccount,
  activeAccountId,
  state,
} = storeToRefs(store);

const menuOpen = ref(false);
const createOpen = ref(false);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const createAccountOpen = ref(false);
const editAccountOpen = ref(false);
const deleteAccountOpen = ref(false);

const draftName = ref("");
const draftAccountId = ref<string | null>(null);
const draftIdentity = ref<{
  career: CaptainCareer | "";
  faction: string;
  race: string;
}>({
  career: "",
  faction: "",
  race: "",
});
const draftAccountName = ref("");
const draftPlatform = ref<CollectionPlatform>("pc");

const platformItems = COLLECTION_PLATFORMS.map((id) => ({
  id,
  label: platformLabel(id),
}));

const captainAccountId = computed(
  () => draftAccountId.value ?? activeAccountId.value ?? "",
);

const nameError = computed(() => {
  const name = draftName.value.trim();
  if (!name) return "Name is required.";
  const accountId = captainAccountId.value;
  if (
    accountId &&
    captainNameTaken(state.value, {
      name,
      accountId,
      exceptCharacterId: renameOpen.value
        ? (activeCharacterId.value ?? undefined)
        : undefined,
    })
  ) {
    return "A captain with that name already exists on this account.";
  }
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

const accountError = computed(() => {
  const name =
    draftAccountName.value.trim() ||
    unusedAccountName(
      state.value,
      draftPlatform.value,
      editAccountOpen.value ? (activeAccountId.value ?? undefined) : undefined,
    );
  if (!name) return "Name is required.";
  if (
    accountNameTaken(state.value, {
      name,
      exceptAccountId: editAccountOpen.value
        ? (activeAccountId.value ?? undefined)
        : undefined,
    })
  ) {
    return "An account with that name already exists.";
  }
  return "";
});

function resetIdentity() {
  draftIdentity.value = { career: "", faction: "", race: "" };
}

function openCreate(accountId?: string) {
  draftName.value = "";
  draftAccountId.value = accountId ?? activeAccountId.value;
  resetIdentity();
  createOpen.value = true;
}

function openRename() {
  draftName.value = activeCharacter.value?.name ?? "";
  draftAccountId.value = activeCharacter.value?.accountId ?? activeAccountId.value;
  draftIdentity.value = {
    career: activeCharacter.value?.career ?? "",
    faction: activeCharacter.value?.faction ?? "",
    race: activeCharacter.value?.race ?? "",
  };
  renameOpen.value = true;
}

function openCreateAccount() {
  draftPlatform.value = "pc";
  draftAccountName.value = unusedAccountName(state.value, "pc");
  createAccountOpen.value = true;
}

function openEditAccount() {
  if (!activeAccount.value) return;
  draftPlatform.value = activeAccount.value.platform;
  draftAccountName.value = activeAccount.value.name;
  editAccountOpen.value = true;
}

function submitCreate() {
  if (createError.value || !identityReady.value) return;
  store.addCharacter({
    name: draftName.value,
    career: draftIdentity.value.career as CaptainCareer,
    faction: draftIdentity.value.faction,
    race: draftIdentity.value.race,
    ...(draftAccountId.value ? { accountId: draftAccountId.value } : {}),
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
    ...(draftAccountId.value ? { accountId: draftAccountId.value } : {}),
  });
  renameOpen.value = false;
}

function submitDelete() {
  if (!activeCharacterId.value) return;
  store.removeCharacter(activeCharacterId.value);
  deleteOpen.value = false;
}

function submitCreateAccount() {
  if (accountError.value) return;
  store.addAccount({
    name:
      draftAccountName.value.trim() ||
      unusedAccountName(state.value, draftPlatform.value),
    platform: draftPlatform.value,
  });
  createAccountOpen.value = false;
  openCreate(store.activeAccountId ?? undefined);
}

function submitEditAccount() {
  if (!activeAccountId.value || accountError.value) return;
  store.editAccount(activeAccountId.value, {
    name:
      draftAccountName.value.trim() ||
      unusedAccountName(
        state.value,
        draftPlatform.value,
        activeAccountId.value,
      ),
    platform: draftPlatform.value,
  });
  editAccountOpen.value = false;
}

function submitDeleteAccount() {
  if (!activeAccountId.value) return;
  store.removeAccount(activeAccountId.value);
  deleteAccountOpen.value = false;
}

function onPlatformChange(value: CollectionPlatform) {
  const keepCustom =
    draftAccountName.value.trim() &&
    !isStockAccountName(draftAccountName.value);
  draftPlatform.value = value;
  if (!keepCustom) {
    draftAccountName.value = unusedAccountName(state.value, value);
  }
}

function accountCaption(account: { name: string; platform: CollectionPlatform }) {
  const platform = platformLabel(account.platform);
  if (isStockAccountName(account.name, account.platform)) {
    return account.name;
  }
  return `${account.name} · ${platform}`;
}

const switcherLabel = computed(() => {
  const captain = activeCharacter.value;
  const account = activeAccount.value;
  if (!captain) {
    return account ? `${account.name} · No captain` : "No captain";
  }
  if (account && accountGroups.value.length > 1) {
    return `${captain.name} · ${account.name}`;
  }
  return captain.name;
});
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
          {{ switcherLabel }}
        </v-btn>
      </template>

      <v-list density="compact" min-width="260">
        <template v-for="group in accountGroups" :key="group.account.id">
          <v-list-subheader class="character-switcher__account">
            <v-icon size="18" class="mr-2">
              {{ platformIcon(group.account.platform) }}
            </v-icon>
            {{ accountCaption(group.account) }}
          </v-list-subheader>
          <v-list-item
            v-for="character in group.characters"
            :key="character.id"
            :active="character.id === activeCharacterId"
            :title="character.name"
            @click="store.selectCharacter(character.id)"
          />
          <v-list-item
            title="New captain"
            prepend-icon="mdi-plus"
            @click="openCreate(group.account.id)"
          />
        </template>
        <v-list-item
          v-if="accountGroups.length === 0"
          title="New captain"
          prepend-icon="mdi-plus"
          @click="openCreate()"
        />
        <v-divider />
        <v-list-item
          title="New account"
          prepend-icon="mdi-folder-plus-outline"
          @click="openCreateAccount"
        />
        <v-list-item
          title="Edit account"
          prepend-icon="mdi-folder-edit-outline"
          :disabled="!activeAccount"
          @click="openEditAccount"
        />
        <v-list-item
          title="Delete account"
          prepend-icon="mdi-folder-remove-outline"
          :disabled="!activeAccount"
          @click="deleteAccountOpen = true"
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
          <v-select
            v-if="accountGroups.length > 0"
            v-model="draftAccountId"
            :items="accountGroups.map((group) => group.account)"
            item-title="name"
            item-value="id"
            label="Account"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
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
          <v-select
            v-if="accountGroups.length > 0"
            v-model="draftAccountId"
            :items="accountGroups.map((group) => group.account)"
            item-title="name"
            item-value="id"
            label="Account"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
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

    <v-dialog v-model="createAccountOpen" max-width="420">
      <v-card>
        <v-card-title>New account</v-card-title>
        <v-card-text>
          <p class="text-medium-emphasis mb-4">
            Each Cryptic login is its own folder. Steam, Epic, Arc, PlayStation,
            and Xbox do not share unlocks — neither do two PC accounts.
          </p>
          <v-select
            v-model="draftPlatform"
            :items="platformItems"
            item-title="label"
            item-value="id"
            label="Platform"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
            @update:model-value="onPlatformChange"
          />
          <v-text-field
            v-model="draftAccountName"
            label="Folder name"
            :error-messages="draftAccountName.trim() ? accountError : ''"
            hint="A second folder on the same launcher can be PC 2, or a name you choose."
            persistent-hint
            @keydown.enter="submitCreateAccount"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createAccountOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="Boolean(accountError)"
            @click="submitCreateAccount"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editAccountOpen" max-width="420">
      <v-card>
        <v-card-title>Edit account</v-card-title>
        <v-card-text>
          <v-select
            v-model="draftPlatform"
            :items="platformItems"
            item-title="label"
            item-value="id"
            label="Platform"
            variant="outlined"
            density="compact"
            hide-details="auto"
            class="mb-3"
          />
          <v-text-field
            v-model="draftAccountName"
            label="Folder name"
            :error-messages="draftAccountName.trim() ? accountError : ''"
            @keydown.enter="submitEditAccount"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editAccountOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="Boolean(accountError)"
            @click="submitEditAccount"
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
          copies on other captains on this account are kept.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteOpen = false">Cancel</v-btn>
          <v-btn color="error" @click="submitDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteAccountOpen" max-width="440">
      <v-card>
        <v-card-title>Delete account</v-card-title>
        <v-card-text>
          Delete {{ activeAccount?.name }} and every captain on it? Collection and
          loadouts on that STO account are removed. Other accounts are kept.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteAccountOpen = false">Cancel</v-btn>
          <v-btn color="error" @click="submitDeleteAccount">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.character-switcher__account {
  align-items: center;
}
</style>
