<script setup lang="ts">
import { ref } from "vue";
import {
  matchesModifierQuery,
  type ModifierSocketView,
} from "@/logic/loadout/slotModifiers";

const props = defineProps<{
  sockets: ModifierSocketView[];
  disabled?: boolean;
  ariaPrefix: string;
}>();

const emit = defineEmits<{
  pick: [index: number, token: string];
}>();

const query = ref("");
const openIndex = ref<number | null>(null);

function filteredOptions(socket: ModifierSocketView) {
  return socket.options.filter((option) =>
    matchesModifierQuery(option, query.value),
  );
}

function onMenuOpen(index: number, isOpen: boolean) {
  if (isOpen) {
    openIndex.value = index;
    query.value = "";
    return;
  }
  if (openIndex.value === index) openIndex.value = null;
}

function socketLabel(socket: ModifierSocketView): string {
  return socket.value.trim() || "—";
}

function socketTitle(socket: ModifierSocketView): string {
  const selected = socket.options.find((option) => option.token === socket.value);
  if (selected?.stats) return `${selected.token} · ${selected.stats}`;
  if (socket.value) return socket.value;
  return "Choose a modifier";
}
</script>

<template>
  <div class="suffix-mods">
    <v-menu
      v-for="socket in props.sockets"
      :key="socket.index"
      location="bottom"
      :disabled="props.disabled"
      @update:model-value="(open: boolean) => onMenuOpen(socket.index, open)"
    >
      <template #activator="{ props: menuProps }">
        <button
          v-bind="menuProps"
          type="button"
          class="equip-mod equip-mod--suffix"
          :class="{ 'equip-mod--suffix-filled': socket.value }"
          :disabled="props.disabled"
          :aria-label="`${props.ariaPrefix} modifier ${socket.index + 1}: ${socketLabel(socket)}`"
          :title="socketTitle(socket)"
        >
          {{ socketLabel(socket) }}
        </button>
      </template>
      <div class="suffix-menu" role="listbox">
        <v-text-field
          v-model="query"
          density="compact"
          hide-details
          clearable
          label="Search modifiers"
          class="suffix-menu__search"
          @click.stop
        />
        <button
          type="button"
          class="suffix-menu__choice"
          :class="{ 'suffix-menu__choice--active': !socket.value }"
          role="option"
          @click="emit('pick', socket.index, '')"
        >
          <span class="suffix-menu__token">None</span>
        </button>
        <button
          v-for="option in filteredOptions(socket)"
          :key="option.token"
          type="button"
          class="suffix-menu__choice"
          :class="{ 'suffix-menu__choice--active': option.token === socket.value }"
          :title="option.stats"
          role="option"
          @click="emit('pick', socket.index, option.token)"
        >
          <span class="suffix-menu__token">{{ option.token }}</span>
          <span v-if="option.stats" class="suffix-menu__stats">{{ option.stats }}</span>
        </button>
        <p
          v-if="filteredOptions(socket).length === 0"
          class="suffix-menu__empty"
        >
          No modifiers match.
        </p>
      </div>
    </v-menu>
  </div>
</template>

<style scoped>
.suffix-mods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.12rem;
}

.equip-mod {
  width: 100%;
  min-width: 0;
  height: 1.35rem;
  padding: 0 0.1rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: #0d1624;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.58rem;
  line-height: 1.2;
  cursor: pointer;
}

.equip-mod--suffix {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.45);
}

.equip-mod--suffix-filled {
  color: rgba(255, 255, 255, 0.88);
}

.equip-mod:disabled {
  opacity: 0.4;
  cursor: default;
}

.equip-mod:focus-visible {
  outline: 1px solid rgba(125, 211, 252, 0.8);
}

.suffix-menu {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  width: min(22rem, 80vw);
  max-height: 22rem;
  overflow: auto;
  padding: 0.45rem;
  border-radius: 8px;
  background: #101b2a;
  border: 1px solid rgba(125, 211, 252, 0.28);
}

.suffix-menu__search {
  margin-bottom: 0.2rem;
}

.suffix-menu__choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.05rem;
  width: 100%;
  padding: 0.28rem 0.4rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.suffix-menu__choice--active {
  border-color: rgba(125, 211, 252, 0.85);
}

.suffix-menu__choice:focus-visible {
  outline: 1px solid rgba(125, 211, 252, 0.8);
}

.suffix-menu__token {
  font-size: 0.78rem;
  font-weight: 650;
}

.suffix-menu__stats,
.suffix-menu__empty {
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.72rem;
}

.suffix-menu__empty {
  margin: 0.35rem 0.2rem;
}
</style>
