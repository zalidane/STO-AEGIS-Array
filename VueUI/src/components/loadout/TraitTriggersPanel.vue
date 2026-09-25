<script setup lang="ts">
import WikiIcon from "@/components/shared/WikiIcon.vue";
import {
  traitTriggerSatisfactionMark,
  traitTriggerSatisfactionState,
  type TraitTriggerPanelRow,
} from "@/logic/loadout/buildTraitTriggersPanel";
import type { TraitTriggerSatisfaction } from "@/logic/loadout/crossRefTraitTriggers";

defineProps<{
  rows: TraitTriggerPanelRow[];
}>();

function markFor(trigger: TraitTriggerSatisfaction): "✓" | "✗" | null {
  return traitTriggerSatisfactionMark(trigger.satisfied);
}

function stateFor(trigger: TraitTriggerSatisfaction): string {
  return traitTriggerSatisfactionState(trigger.satisfied);
}

function matchedHint(trigger: TraitTriggerSatisfaction): string {
  if (trigger.matchedItems.length === 0) return "";
  return trigger.matchedItems.map((item) => item.name).join(", ");
}
</script>

<template>
  <section v-if="rows.length" class="trait-triggers">
    <header class="trait-triggers__header">
      <h2 class="trait-triggers__title">Trait Triggers</h2>
      <p class="trait-triggers__sub">
        Activation requirements for seated traits. Checkmarks update as you
        seat Bridge Officer powers and gear.
      </p>
    </header>

    <article
      v-for="row in rows"
      :key="`${row.catalogKind}:${row.traitId}:${row.slotId}`"
      class="trait-trigger-row"
    >
      <div class="trait-trigger-row__head">
        <WikiIcon
          :src="row.image"
          :alt="row.traitName"
          :size="36"
        />
        <h3 class="trait-trigger-row__name">{{ row.traitName }}</h3>
      </div>

      <ul v-if="row.triggers.length" class="trait-trigger-list">
        <li
          v-for="(trigger, index) in row.triggers"
          :key="`${trigger.kind}:${trigger.label}:${index}`"
          class="trait-trigger-clause"
          :class="`trait-trigger-clause--${stateFor(trigger)}`"
        >
          <span
            v-if="markFor(trigger)"
            class="trait-trigger-clause__mark"
            aria-hidden="true"
          >
            {{ markFor(trigger) }}
          </span>
          <span
            v-else
            class="trait-trigger-clause__mark trait-trigger-clause__mark--empty"
            aria-hidden="true"
          />
          <div class="trait-trigger-clause__body">
            <p class="trait-trigger-clause__label">{{ trigger.label }}</p>
            <p
              v-if="trigger.satisfied === true && matchedHint(trigger)"
              class="trait-trigger-clause__match"
            >
              Matched: {{ matchedHint(trigger) }}
            </p>
            <p
              v-else-if="trigger.satisfied === null"
              class="trait-trigger-clause__note"
            >
              Combat-state / descriptive — not checked against the loadout.
            </p>
          </div>
        </li>
      </ul>
      <p v-else class="trait-trigger-row__empty">
        No structured activation trigger found for this trait.
      </p>
    </article>
  </section>
</template>

<style scoped>
.trait-triggers {
  padding: 0.85rem 1rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background: #101b2a;
}

.trait-triggers__header {
  margin-bottom: 0.85rem;
}

.trait-triggers__title {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.trait-triggers__sub {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem;
}

.trait-trigger-row {
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  background: #0c1624;
}

.trait-trigger-row + .trait-trigger-row {
  margin-top: 0.65rem;
}

.trait-trigger-row__head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.55rem;
}

.trait-trigger-row__name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 650;
  color: rgba(255, 255, 255, 0.92);
}

.trait-trigger-row__empty {
  margin: 0;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.5);
}

.trait-trigger-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.trait-trigger-clause {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.trait-trigger-clause__mark {
  flex: 0 0 1.25rem;
  width: 1.25rem;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
}

.trait-trigger-clause__mark--empty {
  opacity: 0;
}

.trait-trigger-clause--satisfied .trait-trigger-clause__mark {
  color: #4ade80;
}

.trait-trigger-clause--unsatisfied .trait-trigger-clause__mark {
  color: #f87171;
}

.trait-trigger-clause--descriptive {
  background: rgba(125, 211, 252, 0.06);
}

.trait-trigger-clause__body {
  min-width: 0;
  flex: 1;
}

.trait-trigger-clause__label {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.88);
}

.trait-trigger-clause__match,
.trait-trigger-clause__note {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.55);
}
</style>
