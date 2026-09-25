<script setup lang="ts">
import WikiIcon from "@/components/shared/WikiIcon.vue";
import type { CaptainTraitGroup, CaptainTraitSlot } from "@/logic/loadout/captainTraits";
import {
  traitTriggerSatisfactionMark,
  type TraitTriggerIconStatus,
} from "@/logic/loadout/buildTraitTriggersPanel";

export type CaptainTraitSlotView = {
  slot: CaptainTraitSlot;
  item: { name: string; image?: string | null } | null;
  ownedCount?: number;
  /** Present when this seat has structured activation triggers. */
  triggerStatus?: TraitTriggerIconStatus | null;
};

const props = defineProps<{
  title: string;
  subtitle?: string;
  /** Shared / public builds: show seats without picker chrome. */
  readonly?: boolean;
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
  if (!props.readonly && view.ownedCount) {
    return `Empty ${view.slot.label} · ${view.ownedCount} owned`;
  }
  return `Empty ${view.slot.label}`;
}

function onPick(slot: CaptainTraitSlot) {
  if (props.readonly || slot.locked) return;
  emit("pick", slot);
}

function markFor(status: TraitTriggerIconStatus): "✓" | "✗" | null {
  return traitTriggerSatisfactionMark(status.satisfied);
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
            'trait-slot--readonly': readonly,
            'trait-slot--trigger-ok':
              view.triggerStatus && view.triggerStatus.satisfied,
            'trait-slot--trigger-miss':
              view.triggerStatus && !view.triggerStatus.satisfied,
          }"
          :disabled="readonly || view.slot.locked"
          :title="slotTitle(view)"
          :aria-label="slotTitle(view)"
          @click="onPick(view.slot)"
        >
          <WikiIcon
            v-if="view.item"
            :src="view.item.image"
            :alt="view.item.name"
            :size="40"
          />
          <span v-else-if="view.slot.locked" class="trait-slot__lock">LOCK</span>
          <span
            v-else-if="!readonly && view.ownedCount"
            class="trait-slot__owned"
          >
            {{ view.ownedCount }}
          </span>

          <span
            v-if="view.triggerStatus && markFor(view.triggerStatus)"
            class="trait-slot__trigger-mark"
            :class="
              view.triggerStatus.satisfied
                ? 'trait-slot__trigger-mark--ok'
                : 'trait-slot__trigger-mark--miss'
            "
            aria-hidden="true"
          >
            {{ markFor(view.triggerStatus) }}
          </span>

          <span
            v-if="view.triggerStatus && view.item"
            class="trait-slot__trigger-popup"
            role="tooltip"
          >
            <span class="trait-slot__trigger-popup-line">{{
              view.triggerStatus.traitName
            }}</span>
            <span class="trait-slot__trigger-popup-line">{{
              view.triggerStatus.shortDescription || "—"
            }}</span>
            <span class="trait-slot__trigger-popup-line">{{
              view.triggerStatus.statusLine
            }}</span>
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
  position: relative;
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

.trait-slot:disabled:not(.trait-slot--locked),
.trait-slot--readonly {
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

.trait-slot__trigger-mark {
  position: absolute;
  right: 0.08rem;
  bottom: 0.02rem;
  z-index: 1;
  min-width: 0.95rem;
  height: 0.95rem;
  padding: 0 0.1rem;
  border-radius: 3px;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 0.95rem;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(8, 14, 24, 0.85);
}

.trait-slot__trigger-mark--ok {
  color: #86efac;
  background: rgba(22, 101, 52, 0.92);
}

.trait-slot__trigger-mark--miss {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.92);
}

.trait-slot__trigger-popup {
  display: none;
  position: absolute;
  left: 50%;
  bottom: calc(100% + 0.4rem);
  z-index: 5;
  width: max-content;
  max-width: 16rem;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(125, 211, 252, 0.35);
  background: #0b1522;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45);
  text-align: left;
  transform: translateX(-50%);
  pointer-events: none;
}

.trait-slot__trigger-popup-line {
  display: block;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.72rem;
  line-height: 1.35;
}

.trait-slot__trigger-popup-line + .trait-slot__trigger-popup-line {
  margin-top: 0.2rem;
}

.trait-slot__trigger-popup-line:first-child {
  font-weight: 700;
  color: #e2f3ff;
}

.trait-slot__trigger-popup-line:last-child {
  color: #9fd9f8;
}

.trait-slot:hover .trait-slot__trigger-popup,
.trait-slot:focus-visible .trait-slot__trigger-popup {
  display: block;
}
</style>
