<script setup lang="ts">
import { ref } from "vue";
import {
  COMBAT_PARSE_ERRORS,
  combatLogFileError,
  formatCombatDps,
  formatCombatDuration,
  parseCombatLog,
  readCombatLogText,
  type CombatParseSummary,
} from "@/logic/combatlog";

const props = defineProps<{
  captainName: string;
  parse?: CombatParseSummary | null;
}>();

const emit = defineEmits<{
  parsed: [parse: CombatParseSummary];
  clear: [];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const error = ref("");
const busy = ref(false);

function openPicker() {
  error.value = "";
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  busy.value = true;
  error.value = "";
  try {
    const text = await readCombatLogText(file);
    const result = parseCombatLog(text, {
      captainName: props.captainName,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      error.value = COMBAT_PARSE_ERRORS[result.reason];
      return;
    }
    emit("parsed", result.parse);
  } catch (err) {
    error.value = combatLogFileError(err);
  } finally {
    input.value = "";
    busy.value = false;
  }
}
</script>

<template>
  <section class="combat-log">
    <header class="combat-log__header">
      <div>
        <h2 class="combat-log__title">Combat log</h2>
        <p class="combat-log__lede">
          Optional. Upload this PC client’s combatlog.log. The parser stays in
          the browser, keeps {{ captainName }}, and does not store the raw file.
          Map names are not in the log — fights split on idle gaps. If the game
          is running, copy the log out of the GameClient folder first.
        </p>
      </div>
      <div class="combat-log__actions">
        <input
          ref="fileInput"
          class="combat-log__file"
          type="file"
          accept=".log,.txt,text/plain"
          @change="onFileChange"
        />
        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          :loading="busy"
          @click="openPicker"
        >
          {{ parse ? "Replace log" : "Upload combatlog.log" }}
        </v-btn>
        <v-btn
          v-if="parse"
          size="small"
          variant="text"
          color="error"
          @click="emit('clear')"
        >
          Remove parse
        </v-btn>
      </div>
    </header>

    <v-alert v-if="error" type="warning" variant="tonal" density="compact">
      {{ error }}
    </v-alert>

    <p v-if="parse" class="combat-log__meta">
      Matched {{ parse.captainLabel }} from {{ parse.fileName }}
    </p>

    <div v-if="parse" class="combat-log__fights">
      <article
        v-for="fight in parse.fights"
        :key="fight.index"
        class="fight-card"
      >
        <h3 class="fight-card__title">Combat {{ fight.index }}</h3>
        <p class="fight-card__dps">
          {{ formatCombatDps(fight.dps) }}
          <span class="fight-card__unit">DPS</span>
        </p>
        <p class="fight-card__meta">
          {{ formatCombatDuration(fight.durationMs) }}
          · {{ formatCombatDps(fight.damageOut) }} damage
        </p>
        <p class="fight-card__role">{{ fight.participation }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.combat-log {
  margin-bottom: 1.25rem;
  padding: 1rem 1.05rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #101b2a;
}

.combat-log__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.combat-log__title {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.combat-log__lede {
  margin: 0;
  max-width: 42rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.88rem;
  line-height: 1.45;
}

.combat-log__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.combat-log__file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.combat-log__meta {
  margin: 0 0 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.82rem;
}

.combat-log__fights {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.fight-card {
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background: #0c1624;
}

.fight-card__title {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.fight-card__dps {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.fight-card__unit {
  margin-left: 0.25rem;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.fight-card__meta,
.fight-card__role {
  margin: 0.35rem 0 0;
  font-size: 0.84rem;
  color: rgba(255, 255, 255, 0.7);
}

.fight-card__role {
  color: #e2e8f0;
}
</style>
