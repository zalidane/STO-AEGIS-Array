<script setup lang="ts">
import WikiIcon from "@/components/shared/WikiIcon.vue";
import type { CaptainTraitGroup, CaptainTraitSlot } from "@/logic/loadout/captainTraits";

export type CaptainTraitSlotView = {
  slot: CaptainTraitSlot;
  item: { name: string; image?: string | null } | null;
  ownedCount?: number;
};

const props = defineProps<{
  title: string;
  subtitle?: string;
  sections: Array<{
    group: CaptainTraitGroup;
    label: string;
    slots: CaptainTraitSlotView[];
  }>;
}>();

const emit = defineEmits<{
  pick: [slot: CaptainTraitSlot];
}>();

function slotTitle(view: CaptainTraitSlotView): string {
  if (view.slot.locked) return `${view.slot.label} · Locked`;
  if (view.item) return `${view.slot.label}: ${view.item.name}`;
  if (view.ownedCount) return `Empty ${view.slot.label} · ${view.ownedCount} owned`;
  return `Empty ${view.slot.label}`;
}
</script>

<template>
  <section class="captain-traits">
    <header class="captain-traits__header">
      <h2 class="captain-traits__title">{{ title }}</h2>
      <p v-if="subtitle" class="captain-traits__sub">{{ subtitle }}</p>
    </header>

    <div
      v-for="section in sections"
      :key="section.group"
      class="trait-band"
      :class="`trait-band--${section.group}`"
    >
      <h3 class="trait-band__label">{{ section.label }}</h3>
      <div class="trait-band__slots">
        <button
          v-for="view in section.slots"
          :key="view.slot.id"
          type="button"
          class="trait-slot"
          :class="{
            'trait-slot--filled': view.item,
            'trait-slot--locked': view.slot.locked,
          }"
          :disabled="view.slot.locked"
          :title="slotTitle(view)"
          :aria-label="slotTitle(view)"
          @click="emit('pick', view.slot)"
        >
          <WikiIcon
            v-if="view.item"
            :src="view.item.image"
            :alt="view.item.name"
            :size="40"
          />
          <span v-else-if="view.slot.locked" class="trait-slot__lock">LOCK</span>
          <span
            v-else-if="view.ownedCount"
            class="trait-slot__owned"
          >
            {{ view.ownedCount }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.captain-traits {
  padding: 0.85rem 1rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background: #101b2a;
}

.captain-traits__header {
  margin-bottom: 0.85rem;
}

.captain-traits__title {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.captain-traits__sub {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem;
}

.trait-band {
  margin-bottom: 0.85rem;
}

.trait-band:last-child {
  margin-bottom: 0;
}

.trait-band__label {
  margin: 0 0 0.45rem;
  padding: 0.28rem 0.75rem;
  width: fit-content;
  max-width: 100%;
  border-radius: 999px;
  background: #16324f;
  color: #9fd9f8;
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.trait-band__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
}

.trait-slot {
  width: 3.1rem;
  height: 3.1rem;
  padding: 0.14rem;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: linear-gradient(160deg, #152336, #0d1624);
  color: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.trait-slot--filled {
  border-style: solid;
  border-color: rgba(125, 211, 252, 0.5);
}

.trait-band--personalSpace .trait-band__label {
  background: #4a2418;
  color: #f3b48a;
}

.trait-band--personalSpace .trait-slot--filled {
  border-color: rgba(232, 140, 80, 0.75);
  box-shadow: 0 0 10px rgba(232, 100, 40, 0.32);
}

.trait-band--starship .trait-band__label,
.trait-band--shipSpecific .trait-band__label {
  background: #16324f;
  color: #9fd9f8;
}

.trait-band--starship .trait-slot--filled,
.trait-band--shipSpecific .trait-slot--filled {
  border-color: rgba(96, 210, 255, 0.8);
  box-shadow: 0 0 10px rgba(80, 190, 255, 0.28);
}

.trait-band--spaceReputation .trait-band__label {
  background: #2a1f4a;
  color: #c4b5fd;
}

.trait-band--spaceReputation .trait-slot--filled {
  border-color: rgba(167, 139, 250, 0.75);
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.28);
}

.trait-band--activeSpaceReputation .trait-band__label {
  background: #14363a;
  color: #99f6e4;
}

.trait-band--activeSpaceReputation .trait-slot--filled {
  border-color: rgba(45, 212, 191, 0.75);
  box-shadow: 0 0 10px rgba(20, 184, 166, 0.28);
}

.trait-slot--locked {
  cursor: default;
  opacity: 0.55;
}

.trait-slot:disabled:not(.trait-slot--locked) {
  cursor: default;
}

.trait-slot:not(:disabled):hover,
.trait-slot:not(:disabled):focus-visible {
  border-color: rgba(125, 211, 252, 0.9);
}

.trait-slot__owned {
  font-size: 0.78rem;
  font-weight: 650;
  color: #7dd3fc;
}

.trait-slot__lock {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}
</style>
