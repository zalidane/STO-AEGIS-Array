<script setup lang="ts">
import { computed, ref } from "vue";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import {
  ARTICLE_TITLE,
  ARTICLE_URL,
  PACK_NAME,
  PACK_OFFERS,
  REWARDS,
  TIERS,
  TIER_BY_ID,
  allTargetsHit,
  buyFromStore,
  canBuyFromStore,
  canPurchase,
  createInitialState,
  filterPackTargetShips,
  groupInventoryByTier,
  keepReward,
  openPack,
  openRemainingPacks,
  ownedCount,
  publishedTierOdds,
  purchaseAndOpenAll,
  purchasePacks,
  resetSimulator,
  schematicsValueForEntry,
  setAutoTakeSchematics,
  shipRewards,
  takeSchematics,
  targetsObtained,
  toggleTarget,
  totalInventorySchematicsValue,
  type PackOfferId,
  type SimulatorState,
} from "@/logic/packSimulator";

type SimTab = "configuration" | "history" | "odds";

const state = ref<SimulatorState>(createInitialState());
/** Vuetify clearable fields emit `null`; keep a string so filtering never throws. */
const rewardFilter = ref<string>("");
const errorMessage = ref<string | null>(null);
const activeTab = ref<SimTab>("configuration");

const tierOdds = publishedTierOdds();
const ships = shipRewards();

const filteredShips = computed(() =>
  filterPackTargetShips(rewardFilter.value, ships),
);

function onRewardFilterUpdate(value: unknown) {
  rewardFilter.value = value == null ? "" : String(value);
}

const obtainedTargets = computed(() => targetsObtained(state.value));
const targetsComplete = computed(() => allTargetsHit(state.value));
const inventoryGroups = computed(() =>
  groupInventoryByTier(state.value.inventory),
);
const inventorySchematicsValue = computed(() =>
  totalInventorySchematicsValue(state.value.inventory),
);
const zenPerPack = computed(() => {
  if (state.value.packsOpened <= 0) return null;
  return state.value.zenSpent / state.value.packsOpened;
});

function run(action: () => SimulatorState) {
  errorMessage.value = null;
  try {
    state.value = action();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Something went wrong.";
  }
}

function buy(offerId: PackOfferId) {
  run(() => purchasePacks(state.value, offerId));
}

function buyAndOpen(offerId: PackOfferId) {
  run(() => purchaseAndOpenAll(state.value, offerId));
}

function openOne() {
  run(() => openPack(state.value));
}

function openAll() {
  run(() => openRemainingPacks(state.value));
}

function keep() {
  run(() => keepReward(state.value));
}

function take() {
  run(() => takeSchematics(state.value));
}

function onToggleTarget(rewardId: string) {
  state.value = toggleTarget(state.value, rewardId);
}

function onAutoTakeUpdate(value: unknown) {
  state.value = setAutoTakeSchematics(state.value, Boolean(value));
}

function onBuyStore(rewardId: string) {
  run(() => buyFromStore(state.value, rewardId));
}

function onReset() {
  state.value = resetSimulator(true, state.value);
  errorMessage.value = null;
}

function offerDisabled(offerId: PackOfferId): boolean {
  return !canPurchase(state.value, offerId).ok;
}

function storeDisabled(rewardId: string): boolean {
  return !canBuyFromStore(state.value, rewardId).ok;
}

function formatZen(value: number): string {
  return value.toLocaleString();
}

function historyLabel(event: SimulatorState["history"][number]): string {
  switch (event.type) {
    case "purchase":
      return `Bought ${event.offerId} (+${event.packsAdded} packs${
        event.bonusSchematics
          ? `, +${event.bonusSchematics} Schematics`
          : ""
      }) for ${formatZen(event.zenSpent)} Zen`;
    case "kept":
      return `Kept ${event.rewardName}`;
    case "schematics":
      return `Took ${event.schematicsGained} Schematics instead of ${event.rewardName}`;
    case "storePurchase":
      return `Bought ${event.rewardName} from Icon Store (−${event.schematicsSpent} Schematics)`;
  }
}
</script>

<template>
  <v-container class="pack-sim" fluid>
    <AppBreadcrumbs />

    <header class="pack-sim__header">
      <h1 class="pack-sim__title">Pack Opening Simulator</h1>
      <p class="pack-sim__lede">
        Simulate {{ PACK_NAME }} opens from
        <a :href="ARTICLE_URL" target="_blank" rel="noopener noreferrer">{{
          ARTICLE_TITLE
        }}</a
        >. Track Zen spend, Schematics, and progress toward targeted ships.
      </p>
    </header>

    <v-alert
      class="pack-sim__notice"
      type="info"
      variant="tonal"
      density="comfortable"
    >
      Tier odds match the livestream published chance table (1-in-N). Items
      inside a tier are equally likely. Rolls normalize the published weights
      because those percents sum slightly over 100%.
    </v-alert>

    <v-alert
      v-if="errorMessage"
      class="mb-4"
      type="error"
      variant="tonal"
      density="comfortable"
      closable
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <section class="pack-sim__stats" aria-label="Running totals">
      <div class="stat">
        <span class="stat__label">Zen spent</span>
        <span class="stat__value">{{ formatZen(state.zenSpent) }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Schematics</span>
        <span class="stat__value">{{ formatZen(state.schematics) }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Unopened</span>
        <span class="stat__value">{{ state.unopenedPacks }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Opened</span>
        <span class="stat__value">{{ state.packsOpened }}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Zen / open</span>
        <span class="stat__value">{{
          zenPerPack == null ? "—" : formatZen(Math.round(zenPerPack))
        }}</span>
      </div>
    </section>

    <section class="pack-sim__panel" aria-labelledby="buy-heading">
      <div class="pack-sim__panel-head">
        <h2 id="buy-heading">Buy packs</h2>
        <v-btn color="warning" variant="outlined" size="small" @click="onReset">
          Reset simulator
        </v-btn>
      </div>
      <p class="pack-sim__hint">
        Prices from the Zen Store listing in the article. The 60-pack includes
        60 bonus Schematics and is once per account.
      </p>
      <div class="pack-sim__actions">
        <div v-for="offer in PACK_OFFERS" :key="offer.id" class="offer">
          <div class="offer__meta">
            <strong>{{ offer.label }}</strong>
            <span
              >{{ formatZen(offer.zenCost) }} Zen ·
              {{ offer.packCount }} packs</span
            >
            <span v-if="offer.bonusSchematics">
              +{{ offer.bonusSchematics }} bonus Schematics
            </span>
            <span
              v-if="offer.oncePerAccount && state.boughtSixtyBundle"
              class="offer__used"
            >
              Already purchased
            </span>
          </div>
          <div class="offer__buttons">
            <v-btn
              size="small"
              variant="tonal"
              :disabled="offerDisabled(offer.id)"
              @click="buy(offer.id)"
            >
              Buy
            </v-btn>
            <v-btn
              size="small"
              color="primary"
              :disabled="offerDisabled(offer.id)"
              @click="buyAndOpen(offer.id)"
            >
              Buy &amp; open
            </v-btn>
          </div>
        </div>
      </div>
    </section>

    <section class="pack-sim__panel" aria-labelledby="open-heading">
      <div class="pack-sim__panel-head">
        <h2 id="open-heading">Open packs</h2>
        <div class="pack-sim__actions pack-sim__actions--inline">
          <v-btn
            color="primary"
            :disabled="state.unopenedPacks <= 0 || !!state.pending"
            @click="openOne"
          >
            Open 1
          </v-btn>
          <v-btn
            variant="tonal"
            :disabled="state.unopenedPacks <= 0 || !!state.pending"
            @click="openAll"
          >
            Open all
          </v-btn>
        </div>
      </div>

      <div v-if="state.pending" class="pending">
        <h3>Pack result</h3>
        <p class="pending__tier">
          {{ TIER_BY_ID.get(state.pending.reward.tierId)?.label }} tier
        </p>
        <p class="pending__name">{{ state.pending.reward.name }}</p>
        <p class="pending__choice">
          Keep the prize, or take
          <strong>{{ state.pending.schematicChoice }} Schematics</strong>
          instead.
        </p>
        <div class="pack-sim__actions pack-sim__actions--inline">
          <v-btn color="success" @click="keep">Keep prize</v-btn>
          <v-btn color="secondary" variant="tonal" @click="take">
            Take {{ state.pending.schematicChoice }} Schematics
          </v-btn>
        </div>
      </div>
      <p v-else class="pack-sim__hint">
        Configure targets and auto-take on the Configuration tab. Open 1 pauses
        for a keep / Schematics choice. Open all and Buy &amp; open apply
        auto-take without prompting (non-targets → Schematics when auto-take is
        on; otherwise prizes are kept).
      </p>
    </section>

    <section class="pack-sim__panel" aria-labelledby="inventory-heading">
      <div class="pack-sim__panel-head">
        <h2 id="inventory-heading">Inventory</h2>
        <span
          v-if="state.inventory.length"
          class="inventory__forgone"
          title="Schematics you would have if every kept prize took Schematics instead"
        >
          Schematics value:
          {{ formatZen(inventorySchematicsValue) }}
        </span>
      </div>
      <p v-if="!state.inventory.length" class="pack-sim__hint">
        No kept or store-bought rewards yet.
      </p>
      <div v-else class="inventory-groups">
        <div
          v-for="group in inventoryGroups"
          :key="group.tierId"
          class="inventory-group"
        >
          <div class="inventory-group__head">
            <h3>{{ group.label }}</h3>
            <span
              >{{ formatZen(group.schematicsValue) }} Schematics value ({{
                group.schematicChoice
              }}
              each)</span
            >
          </div>
          <ul class="inventory">
            <li v-for="entry in group.entries" :key="entry.rewardId">
              <div class="inventory__main">
                <strong>×{{ entry.count }}</strong>
                {{ entry.name }}
              </div>
              <span class="inventory__value">
                Schematics value:
                {{ formatZen(schematicsValueForEntry(entry)) }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <v-tabs
      v-model="activeTab"
      color="primary"
      bg-color="transparent"
      show-arrows
      class="pack-sim__tabs"
    >
      <v-tab value="configuration">Configuration</v-tab>
      <v-tab value="history">History</v-tab>
      <v-tab value="odds">Odds</v-tab>
    </v-tabs>

    <section
      v-if="activeTab === 'configuration'"
      class="pack-sim__panel pack-sim__panel--tab"
      aria-labelledby="config-heading"
    >
      <h2 id="config-heading">Configuration</h2>

      <v-switch
        :model-value="state.autoTakeSchematics"
        class="mb-4"
        color="primary"
        hide-details
        density="compact"
        label="Auto-take Schematics unless the reward is targeted"
        @update:model-value="onAutoTakeUpdate"
      />
      <p class="pack-sim__hint">
        Off by default. When on, non-target opens convert to Schematics
        automatically so you can buy targets from the Icon Store.
      </p>

      <h3 class="pack-sim__subheader">Target ships</h3>
      <p class="pack-sim__hint">
        Select one or more ships to track. Targeted rewards pause for a keep /
        Schematics choice even when auto-take is on.
      </p>

      <div v-if="state.targetRewardIds.length" class="targets-status">
        <v-chip
          v-for="target in obtainedTargets"
          :key="target.rewardId"
          :color="target.count > 0 ? 'success' : 'default'"
          variant="tonal"
          size="small"
          class="ma-1"
        >
          {{ target.name }}
          <template v-if="target.count > 0"> · ×{{ target.count }}</template>
          <template v-else> · missing</template>
        </v-chip>
        <v-alert
          v-if="targetsComplete"
          class="mt-2"
          type="success"
          variant="tonal"
          density="compact"
        >
          All targeted ships obtained after
          {{ formatZen(state.zenSpent) }} Zen.
        </v-alert>
      </div>

      <v-text-field
        :model-value="rewardFilter"
        class="mt-2"
        label="Filter ships"
        density="compact"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        @update:model-value="onRewardFilterUpdate"
      />

      <div class="reward-list">
        <div
          v-for="ship in filteredShips"
          :key="ship.id"
          class="reward-row"
          :class="{
            'reward-row--target': state.targetRewardIds.includes(ship.id),
          }"
        >
          <v-checkbox
            :model-value="state.targetRewardIds.includes(ship.id)"
            density="compact"
            hide-details
            :label="ship.name"
            @update:model-value="onToggleTarget(ship.id)"
          />
          <div class="reward-row__meta">
            <span>{{ TIER_BY_ID.get(ship.tierId)?.label }}</span>
            <span
              >{{ TIER_BY_ID.get(ship.tierId)?.storeCost }} Schematics</span
            >
            <span v-if="ownedCount(state.inventory, ship.id)"
              >Owned ×{{ ownedCount(state.inventory, ship.id) }}</span
            >
            <v-btn
              size="x-small"
              variant="text"
              :disabled="storeDisabled(ship.id)"
              @click="onBuyStore(ship.id)"
            >
              Buy from store
            </v-btn>
          </div>
        </div>
      </div>
    </section>

    <section
      v-else-if="activeTab === 'history'"
      class="pack-sim__panel pack-sim__panel--tab"
      aria-labelledby="history-heading"
    >
      <h2 id="history-heading">History</h2>
      <p v-if="!state.history.length" class="pack-sim__hint">No actions yet.</p>
      <ol v-else class="history">
        <li v-for="(event, index) in state.history.slice(0, 80)" :key="index">
          {{ historyLabel(event) }}
        </li>
      </ol>
    </section>

    <section
      v-else
      class="pack-sim__panel pack-sim__panel--tab"
      aria-labelledby="odds-heading"
    >
      <h2 id="odds-heading">Published tier odds</h2>
      <ul class="odds">
        <li v-for="tier in tierOdds" :key="tier.tierId">
          <span>{{ tier.oddsLabel }}</span>
          <span
            >1 in {{ tier.oneIn }} ·
            {{ tier.publishedPercent.toFixed(3) }}%</span
          >
        </li>
      </ul>
      <p class="pack-sim__hint">
        Ensign items and each ship share their tier’s weight equally. Store
        costs / schematic-choice amounts match the article
        ({{
          TIERS.map((t) => `${t.label} ${t.storeCost}/${t.schematicChoice}`)
            .join("; ")
        }}).
      </p>
      <p class="pack-sim__hint">
        Non-ship Ensign rewards:
        {{
          REWARDS.filter((r) => r.kind === "item")
            .map((r) => r.name)
            .join("; ")
        }}.
      </p>
    </section>
  </v-container>
</template>

<style scoped>
.pack-sim {
  max-width: 56rem;
  padding-bottom: 2.5rem;
}

.pack-sim__header {
  margin: 0.75rem 0 1rem;
}

.pack-sim__title {
  margin: 0 0 0.55rem;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #e8f1fb;
}

.pack-sim__lede {
  margin: 0;
  color: #a9bdd4;
  line-height: 1.5;
}

.pack-sim__lede a {
  color: #7eb6ff;
}

.pack-sim__notice {
  margin-bottom: 1rem;
}

.pack-sim__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.stat {
  padding: 0.85rem 0.9rem;
  border: 1px solid rgba(126, 182, 255, 0.18);
  background: rgba(8, 22, 40, 0.55);
}

.stat__label {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8ea6c0;
}

.stat__value {
  display: block;
  margin-top: 0.25rem;
  font-size: 1.35rem;
  font-weight: 650;
  color: #e8f1fb;
}

.pack-sim__panel {
  margin-bottom: 1.35rem;
  padding: 1rem 1.05rem 1.1rem;
  border: 1px solid rgba(126, 182, 255, 0.14);
  background: rgba(6, 18, 34, 0.45);
}

.pack-sim__panel--tab {
  margin-top: 0;
  border-top: 0;
}

.pack-sim__panel h2 {
  margin: 0 0 0.55rem;
  font-size: 1.15rem;
  color: #e8f1fb;
}

.pack-sim__subheader {
  margin: 1rem 0 0.45rem;
  font-size: 1rem;
  font-weight: 600;
  color: #d7e6f7;
}

.pack-sim__panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}

.pack-sim__panel-head h2 {
  margin: 0;
}

.pack-sim__hint {
  margin: 0 0 0.85rem;
  color: #9bb0c8;
  font-size: 0.92rem;
  line-height: 1.45;
}

.pack-sim__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pack-sim__actions--inline {
  flex-direction: row;
  flex-wrap: wrap;
}

.pack-sim__tabs {
  margin-top: 0.25rem;
}

.offer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-top: 1px solid rgba(126, 182, 255, 0.1);
}

.offer:first-child {
  border-top: 0;
  padding-top: 0;
}

.offer__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: #c5d6ea;
  font-size: 0.92rem;
}

.offer__used {
  color: #e0b35a;
}

.offer__buttons {
  display: flex;
  gap: 0.5rem;
}

.pending {
  margin-top: 0.5rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(126, 182, 255, 0.28);
  background: rgba(20, 48, 82, 0.45);
}

.pending h3 {
  margin: 0 0 0.35rem;
  color: #e8f1fb;
}

.pending__tier {
  margin: 0;
  color: #8ea6c0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pending__name {
  margin: 0.35rem 0 0.55rem;
  font-size: 1.2rem;
  font-weight: 650;
  color: #f3f8ff;
}

.pending__choice {
  margin: 0 0 0.85rem;
  color: #c5d6ea;
}

.reward-list {
  margin-top: 0.75rem;
  max-height: 22rem;
  overflow: auto;
  border: 1px solid rgba(126, 182, 255, 0.12);
}

.reward-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0.65rem;
  border-bottom: 1px solid rgba(126, 182, 255, 0.08);
}

.reward-row--target {
  background: rgba(64, 120, 190, 0.18);
}

.reward-row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  color: #9bb0c8;
  font-size: 0.82rem;
}

.inventory-groups {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.inventory-group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.inventory-group__head h3 {
  margin: 0;
  font-size: 0.98rem;
  color: #e8f1fb;
}

.inventory-group__head span,
.inventory__forgone,
.inventory__value {
  color: #9bb0c8;
  font-size: 0.85rem;
}

.inventory__forgone {
  font-weight: 550;
  color: #c5d6ea;
}

.inventory {
  margin: 0;
  padding-left: 0;
  list-style: none;
  color: #c5d6ea;
}

.inventory li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.35rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(126, 182, 255, 0.08);
}

.inventory__main {
  color: #e8f1fb;
}

.odds,
.history {
  margin: 0;
  padding-left: 1.15rem;
  color: #c5d6ea;
}

.odds li,
.history li {
  margin-bottom: 0.35rem;
}

.odds {
  list-style: none;
  padding-left: 0;
}

.odds li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(126, 182, 255, 0.08);
}

.targets-status {
  margin-bottom: 0.5rem;
}
</style>
