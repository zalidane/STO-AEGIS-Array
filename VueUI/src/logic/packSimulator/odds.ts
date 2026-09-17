import { REWARDS, TIERS, TIER_BY_ID } from "./data";
import type { RewardDefinition, RewardTierId } from "./types";

/**
 * Official per-item odds were not published in the news post (they land in the
 * in-game Pack description). Tier weights use the inverse of each tier's
 * schematic-choice value from the article so rarer tiers drop less often.
 * Items inside a tier share weight equally.
 */
export function provisionalTierWeight(tierId: RewardTierId): number {
  const tier = TIER_BY_ID.get(tierId);
  if (!tier || tier.schematicChoice <= 0) return 0;
  return 1 / tier.schematicChoice;
}

export function buildRewardWeights(
  rewards: readonly RewardDefinition[] = REWARDS,
): { reward: RewardDefinition; weight: number }[] {
  const tierItemCounts = new Map<RewardTierId, number>();
  for (const reward of rewards) {
    tierItemCounts.set(
      reward.tierId,
      (tierItemCounts.get(reward.tierId) ?? 0) + 1,
    );
  }

  return rewards.map((reward) => {
    const count = tierItemCounts.get(reward.tierId) ?? 1;
    return {
      reward,
      weight: provisionalTierWeight(reward.tierId) / count,
    };
  });
}

export function pickWeightedReward(
  random: () => number,
  weighted: { reward: RewardDefinition; weight: number }[] = buildRewardWeights(),
): RewardDefinition {
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0 || weighted.length === 0) {
    throw new Error("No rewards available to roll");
  }

  let roll = random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.reward;
  }
  return weighted[weighted.length - 1]!.reward;
}

export function provisionalTierOdds(): {
  tierId: RewardTierId;
  label: string;
  percent: number;
}[] {
  const total = TIERS.reduce(
    (sum, tier) => sum + provisionalTierWeight(tier.id),
    0,
  );
  return TIERS.map((tier) => ({
    tierId: tier.id,
    label: tier.label,
    percent: (provisionalTierWeight(tier.id) / total) * 100,
  }));
}
