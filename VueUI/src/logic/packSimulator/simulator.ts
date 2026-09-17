import {
  PACK_OFFER_BY_ID,
  REWARD_BY_ID,
  TIER_BY_ID,
  TIERS,
} from "./data";
import { buildRewardWeights, pickWeightedReward } from "./odds";
import type {
  OwnedReward,
  PackOfferId,
  PendingOpen,
  SimulatorEvent,
  SimulatorState,
} from "./types";

export type RandomFn = () => number;

const rewardWeights = buildRewardWeights();

export function createInitialState(): SimulatorState {
  return {
    zenSpent: 0,
    schematics: 0,
    unopenedPacks: 0,
    packsOpened: 0,
    boughtSixtyBundle: false,
    pending: null,
    inventory: [],
    targetRewardIds: [],
    autoTakeSchematics: false,
    history: [],
  };
}

export function canPurchase(
  state: SimulatorState,
  offerId: PackOfferId,
): { ok: true } | { ok: false; reason: string } {
  if (state.pending) {
    return { ok: false, reason: "Resolve the current pack open first." };
  }
  const offer = PACK_OFFER_BY_ID.get(offerId);
  if (!offer) return { ok: false, reason: "Unknown pack offer." };
  if (offer.oncePerAccount && state.boughtSixtyBundle) {
    return {
      ok: false,
      reason: "The 60-pack bundle is limited to once per account.",
    };
  }
  return { ok: true };
}

export function purchasePacks(
  state: SimulatorState,
  offerId: PackOfferId,
): SimulatorState {
  const allowed = canPurchase(state, offerId);
  if (!allowed.ok) throw new Error(allowed.reason);

  const offer = PACK_OFFER_BY_ID.get(offerId)!;
  const event: SimulatorEvent = {
    type: "purchase",
    offerId,
    zenSpent: offer.zenCost,
    packsAdded: offer.packCount,
    bonusSchematics: offer.bonusSchematics,
  };

  return {
    ...state,
    zenSpent: state.zenSpent + offer.zenCost,
    schematics: state.schematics + offer.bonusSchematics,
    unopenedPacks: state.unopenedPacks + offer.packCount,
    boughtSixtyBundle:
      offer.oncePerAccount || state.boughtSixtyBundle,
    history: [event, ...state.history],
  };
}

export function canOpenPack(
  state: SimulatorState,
): { ok: true } | { ok: false; reason: string } {
  if (state.pending) {
    return { ok: false, reason: "Resolve the current pack open first." };
  }
  if (state.unopenedPacks <= 0) {
    return { ok: false, reason: "No unopened packs remaining." };
  }
  return { ok: true };
}

export function openPack(
  state: SimulatorState,
  random: RandomFn = Math.random,
  options: { bulk?: boolean } = {},
): SimulatorState {
  const allowed = canOpenPack(state);
  if (!allowed.ok) throw new Error(allowed.reason);

  const reward = pickWeightedReward(random, rewardWeights);
  const tier = TIER_BY_ID.get(reward.tierId)!;
  const pending: PendingOpen = {
    reward,
    schematicChoice: tier.schematicChoice,
    openedAt: Date.now(),
  };

  const next: SimulatorState = {
    ...state,
    unopenedPacks: state.unopenedPacks - 1,
    packsOpened: state.packsOpened + 1,
    pending,
  };

  return resolveOpenedPack(next, options.bulk === true);
}

/**
 * Apply keep-vs-Schematics policy for a pending open.
 * Interactive opens leave a prompt unless auto-take converts a non-target.
 * Bulk opens ("Open all" / Buy & open) never prompt: auto-take converts
 * non-targets to Schematics; everything else is kept.
 */
export function resolveOpenedPack(
  state: SimulatorState,
  bulk: boolean,
): SimulatorState {
  if (!state.pending) return state;
  const isTarget = state.targetRewardIds.includes(state.pending.reward.id);
  if (state.autoTakeSchematics && !isTarget) {
    return takeSchematics(state);
  }
  if (bulk) {
    return keepReward(state);
  }
  return state;
}

export function keepReward(state: SimulatorState): SimulatorState {
  if (!state.pending) throw new Error("No pending pack open.");

  const { reward } = state.pending;
  const event: SimulatorEvent = {
    type: "kept",
    rewardId: reward.id,
    rewardName: reward.name,
    tierId: reward.tierId,
  };

  return {
    ...state,
    pending: null,
    inventory: addToInventory(state.inventory, reward),
    history: [event, ...state.history],
  };
}

export function takeSchematics(state: SimulatorState): SimulatorState {
  if (!state.pending) throw new Error("No pending pack open.");

  const { reward, schematicChoice } = state.pending;
  const event: SimulatorEvent = {
    type: "schematics",
    rewardId: reward.id,
    rewardName: reward.name,
    tierId: reward.tierId,
    schematicsGained: schematicChoice,
  };

  return {
    ...state,
    pending: null,
    schematics: state.schematics + schematicChoice,
    history: [event, ...state.history],
  };
}

export function canBuyFromStore(
  state: SimulatorState,
  rewardId: string,
): { ok: true; cost: number } | { ok: false; reason: string } {
  if (state.pending) {
    return { ok: false, reason: "Resolve the current pack open first." };
  }
  const reward = REWARD_BY_ID.get(rewardId);
  if (!reward) return { ok: false, reason: "Unknown reward." };
  const tier = TIER_BY_ID.get(reward.tierId);
  if (!tier) return { ok: false, reason: "Unknown tier." };
  if (state.schematics < tier.storeCost) {
    return {
      ok: false,
      reason: `Need ${tier.storeCost} Schematics (have ${state.schematics}).`,
    };
  }
  return { ok: true, cost: tier.storeCost };
}

export function buyFromStore(
  state: SimulatorState,
  rewardId: string,
): SimulatorState {
  const allowed = canBuyFromStore(state, rewardId);
  if (!allowed.ok) throw new Error(allowed.reason);

  const reward = REWARD_BY_ID.get(rewardId)!;
  const event: SimulatorEvent = {
    type: "storePurchase",
    rewardId: reward.id,
    rewardName: reward.name,
    schematicsSpent: allowed.cost,
  };

  return {
    ...state,
    schematics: state.schematics - allowed.cost,
    inventory: addToInventory(state.inventory, reward),
    history: [event, ...state.history],
  };
}

export function setTargets(
  state: SimulatorState,
  targetRewardIds: string[],
): SimulatorState {
  const unique = [...new Set(targetRewardIds)].filter((id) =>
    REWARD_BY_ID.has(id),
  );
  return { ...state, targetRewardIds: unique };
}

export function toggleTarget(
  state: SimulatorState,
  rewardId: string,
): SimulatorState {
  if (!REWARD_BY_ID.has(rewardId)) return state;
  const has = state.targetRewardIds.includes(rewardId);
  const targetRewardIds = has
    ? state.targetRewardIds.filter((id) => id !== rewardId)
    : [...state.targetRewardIds, rewardId];
  return { ...state, targetRewardIds };
}

export function setAutoTakeSchematics(
  state: SimulatorState,
  autoTakeSchematics: boolean,
): SimulatorState {
  return { ...state, autoTakeSchematics };
}

export function resetSimulator(
  preserveTargets = true,
  previous?: SimulatorState,
): SimulatorState {
  const base = createInitialState();
  if (!preserveTargets || !previous) return base;
  return {
    ...base,
    targetRewardIds: [...previous.targetRewardIds],
    autoTakeSchematics: previous.autoTakeSchematics,
  };
}

export function purchaseAndOpenAll(
  state: SimulatorState,
  offerId: PackOfferId,
  random: RandomFn = Math.random,
): SimulatorState {
  let next = purchasePacks(state, offerId);
  while (next.unopenedPacks > 0) {
    next = openPack(next, random, { bulk: true });
  }
  return next;
}

export function openRemainingPacks(
  state: SimulatorState,
  random: RandomFn = Math.random,
): SimulatorState {
  let next = state;
  while (next.unopenedPacks > 0) {
    next = openPack(next, random, { bulk: true });
  }
  return next;
}

export function ownedCount(
  inventory: OwnedReward[],
  rewardId: string,
): number {
  return inventory.find((entry) => entry.rewardId === rewardId)?.count ?? 0;
}

export function targetsObtained(state: SimulatorState): {
  rewardId: string;
  name: string;
  count: number;
}[] {
  return state.targetRewardIds.map((rewardId) => {
    const reward = REWARD_BY_ID.get(rewardId)!;
    return {
      rewardId,
      name: reward.name,
      count: ownedCount(state.inventory, rewardId),
    };
  });
}

export function allTargetsHit(state: SimulatorState): boolean {
  if (state.targetRewardIds.length === 0) return false;
  return state.targetRewardIds.every(
    (rewardId) => ownedCount(state.inventory, rewardId) > 0,
  );
}

export type InventoryTierGroup = {
  tierId: OwnedReward["tierId"];
  label: string;
  schematicChoice: number;
  entries: OwnedReward[];
  /** Schematics that would have been earned if every kept copy took Schematics instead. */
  schematicsValue: number;
};

export function schematicsValueForEntry(entry: OwnedReward): number {
  const tier = TIER_BY_ID.get(entry.tierId);
  if (!tier) return 0;
  return entry.count * tier.schematicChoice;
}

export function groupInventoryByTier(
  inventory: OwnedReward[],
): InventoryTierGroup[] {
  const byTier = new Map<OwnedReward["tierId"], OwnedReward[]>();
  for (const entry of inventory) {
    const list = byTier.get(entry.tierId) ?? [];
    list.push(entry);
    byTier.set(entry.tierId, list);
  }

  return TIERS.filter((tier) => byTier.has(tier.id)).map((tier) => {
    const entries = [...(byTier.get(tier.id) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const schematicsValue = entries.reduce(
      (sum, entry) => sum + schematicsValueForEntry(entry),
      0,
    );
    return {
      tierId: tier.id,
      label: tier.label,
      schematicChoice: tier.schematicChoice,
      entries,
      schematicsValue,
    };
  });
}

export function totalInventorySchematicsValue(inventory: OwnedReward[]): number {
  return inventory.reduce(
    (sum, entry) => sum + schematicsValueForEntry(entry),
    0,
  );
}

function addToInventory(
  inventory: OwnedReward[],
  reward: {
    id: string;
    name: string;
    tierId: OwnedReward["tierId"];
    kind: OwnedReward["kind"];
  },
): OwnedReward[] {
  const existing = inventory.find((entry) => entry.rewardId === reward.id);
  if (!existing) {
    return [
      ...inventory,
      {
        rewardId: reward.id,
        name: reward.name,
        tierId: reward.tierId,
        kind: reward.kind,
        count: 1,
      },
    ];
  }
  return inventory.map((entry) =>
    entry.rewardId === reward.id
      ? { ...entry, count: entry.count + 1 }
      : entry,
  );
}
