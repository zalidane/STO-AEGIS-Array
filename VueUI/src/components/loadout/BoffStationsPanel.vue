<script setup lang="ts">
import WikiIcon from "@/components/shared/WikiIcon.vue";
import {
  BOFF_PLAYABLE_CAREERS,
  type BoffPlayableCareer,
  type BoffStation,
  type BoffStationSlot,
} from "@/logic/loadout/boffPowers";
import { abbreviateBoffPart } from "@/utils/formatters";

export type BoffStationSlotView = {
  slot: BoffStationSlot;
  item: { name: string; image?: string | null } | null;
};

export type BoffStationRowView = {
  station: BoffStation;
  label: string;
  careerLabel: string;
  specLabel?: string;
  careerTheme: string;
  specTheme?: string;
  slots: BoffStationSlotView[];
};

const props = defineProps<{
  stations: BoffStationRowView[];
}>();

const emit = defineEmits<{
  pick: [slot: BoffStationSlot];
  setCareer: [station: BoffStation, career: BoffPlayableCareer];
}>();

function slotTitle(station: BoffStationRowView, view: BoffStationSlotView): string {
  const seat = `${station.label} · ${view.slot.rankLabel}`;
  if (view.item) return `${seat}: ${view.item.name}`;
  if (station.station.needsCareerChoice && !station.station.careerChoice) {
    return `${seat} · Choose officer career first`;
  }
  return `Empty ${seat}`;
}

function careerAbbrev(career: BoffPlayableCareer): string {
  return abbreviateBoffPart(career);
}
</script>

<template>
  <section class="boff-stations">
    <header class="boff-stations__header">
      <h2 class="boff-stations__title">Bridge officers</h2>
      <p class="boff-stations__sub">
        Powers match each seat’s rank, career, and specialization.
      </p>
    </header>

    <div
      v-for="row in props.stations"
      :key="row.station.index"
      class="boff-station"
    >
      <div class="boff-station__meta">
        <span
          class="boff-station__chip"
          :class="{ 'boff-station__chip--hybrid': !!row.specTheme }"
          :style="{
            '--boff-career': `rgb(var(--v-theme-${row.careerTheme}))`,
            '--boff-spec': row.specTheme
              ? `rgb(var(--v-theme-${row.specTheme}))`
              : undefined,
          }"
        >
          {{ row.careerLabel }}
          <template v-if="row.specLabel">-{{ row.specLabel }}</template>
        </span>
        <div
          v-if="row.station.needsCareerChoice"
          class="boff-station__careers"
        >
          <button
            v-for="career in BOFF_PLAYABLE_CAREERS"
            :key="career"
            type="button"
            class="boff-career"
            :class="{
              'boff-career--active': row.station.careerChoice === career,
            }"
            :title="`Seat a ${career} officer`"
            :aria-label="`Seat a ${career} officer`"
            :aria-pressed="row.station.careerChoice === career"
            @click="emit('setCareer', row.station, career)"
          >
            {{ careerAbbrev(career) }}
          </button>
        </div>
      </div>
      <div class="boff-station__slots">
        <button
          v-for="view in row.slots"
          :key="view.slot.id"
          type="button"
          class="boff-slot"
          :class="{ 'boff-slot--filled': view.item }"
          :title="slotTitle(row, view)"
          :aria-label="slotTitle(row, view)"
          @click="emit('pick', view.slot)"
        >
          <WikiIcon
            v-if="view.item"
            :src="view.item.image"
            :alt="view.item.name"
            :size="32"
          />
          <span v-if="view.item" class="boff-slot__name">{{
            view.item.name
          }}</span>
          <span v-else class="boff-slot__rank">{{ view.slot.rankLabel }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.boff-stations {
  padding: 0.85rem 0.7rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background: #101b2a;
}

.boff-stations__header {
  margin-bottom: 0.85rem;
}

.boff-stations__title {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.boff-stations__sub {
  margin: 0.35rem 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem;
}

.boff-station {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid rgba(125, 211, 252, 0.12);
}

.boff-station:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.boff-station__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  min-width: 5.75rem;
  flex: 0 1 auto;
}

.boff-station__chip {
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: #16324f;
  color: #9fd9f8;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  box-shadow: inset 3px 0 0 var(--boff-career);
  white-space: nowrap;
}

.boff-station__chip--hybrid {
  box-shadow:
    inset 3px 0 0 var(--boff-career),
    inset -3px 0 0 var(--boff-spec);
}

.boff-station__careers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.boff-career {
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.68rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.boff-career--active {
  border-color: rgba(125, 211, 252, 0.85);
  color: #7dd3fc;
}

.boff-station__slots {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 0.14rem;
  flex: 0 0 auto;
}

.boff-slot {
  width: 2.55rem;
  height: 2.55rem;
  padding: 0.1rem;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: linear-gradient(160deg, #152336, #0d1624);
  color: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.boff-slot :deep(.wiki-icon),
.boff-slot__name,
.boff-slot__rank {
  grid-area: 1 / 1;
}

.boff-slot__name {
  font-size: 0.48rem;
  line-height: 1.1;
  letter-spacing: 0.01em;
  text-align: center;
  color: rgba(255, 255, 255, 0.82);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  padding: 0.1rem;
  pointer-events: none;
}

.boff-slot--filled :deep(.wiki-icon) {
  z-index: 1;
  background: #101b2a;
}

.boff-slot--filled {
  border-style: solid;
  border-color: rgba(125, 211, 252, 0.5);
}

.boff-slot__rank {
  font-size: 0.62rem;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.42);
  text-align: center;
  line-height: 1.15;
}
</style>
