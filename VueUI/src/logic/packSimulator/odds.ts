import { REWARDS, TIERS, TIER_BY_ID } from "./data";
import type { RewardDefinition, RewardTierId } from "./types";

/**
 * Tier drop weights from the livestream published odds table (1-in-N).
 * Items inside a tier share that tier's weight equally.
 * Weights are normalized when rolling because the published percents sum
 * slightly over 100%.
 */
export function publishedTierWeight(tierId: RewardTierId): number {
  const tier = TIER_BY_ID.get(tierId);
  if (!tier || tier.oneIn <= 0) return 0;
  return 1 / tier.oneIn;
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
      weight: publishedTierWeight(reward.tierId) / count,
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

export function publishedTierOdds(): {
  tierId: RewardTierId;
  label: string;
  oddsLabel: string;
  oneIn: number;
  publishedPercent: number;
  /** Normalized percent used by the roller (sums to 100). */
  rollPercent: number;
}[] {
  const total = TIERS.reduce(
    (sum, tier) => sum + publishedTierWeight(tier.id),
    0,
  );
  return TIERS.map((tier) => ({
    tierId: tier.id,
    label: tier.label,
    oddsLabel: tier.oddsLabel,
    oneIn: tier.oneIn,
    publishedPercent: tier.publishedPercent,
    rollPercent: (publishedTierWeight(tier.id) / total) * 100,
  }));
}
