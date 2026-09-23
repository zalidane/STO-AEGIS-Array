import { describe, expect, it } from "vitest";
import {
  ARTICLE_URL,
  PACK_OFFERS,
  REWARDS,
  TIERS,
  allTargetsHit,
  buildRewardWeights,
  buyFromStore,
  canPurchase,
  createInitialState,
  groupInventoryByTier,
  keepReward,
  openPack,
  openRemainingPacks,
  ownedCount,
  pickWeightedReward,
  publishedTierOdds,
  purchaseAndOpenAll,
  purchasePacks,
  resetSimulator,
  schematicsValueForEntry,
  setAutoTakeSchematics,
  shipRewards,
  takeSchematics,
  toggleTarget,
  totalInventorySchematicsValue,
  filterPackTargetShips,
} from "@/logic/packSimulator";

function randomForReward(rewardId: string): () => number {
  const weighted = buildRewardWeights();
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cumulative = 0;
  for (const entry of weighted) {
    const mid = cumulative + entry.weight / 2;
    cumulative += entry.weight;
    if (entry.reward.id === rewardId) {
      return () => mid / total;
    }
  }
  throw new Error(`Reward ${rewardId} not found in weights`);
}

describe("pack simulator data", () => {
  it("matches the published Zen Store offers", () => {
    expect(PACK_OFFERS).toEqual([
      expect.objectContaining({
        id: "single",
        zenCost: 450,
        packCount: 1,
        bonusSchematics: 0,
      }),
      expect.objectContaining({
        id: "twelve",
        zenCost: 4500,
        packCount: 12,
        bonusSchematics: 0,
      }),
      expect.objectContaining({
        id: "sixty",
        zenCost: 22500,
        packCount: 60,
        bonusSchematics: 60,
        oncePerAccount: true,
      }),
    ]);
    expect(ARTICLE_URL).toContain("11583056");
  });

  it("includes every listed ship and Ensign item from the article", () => {
    // Article summary says "61 starships"; the published reward list has 56 ships + 6 Ensign items.
    expect(shipRewards()).toHaveLength(56);
    expect(REWARDS).toHaveLength(62);
    expect(REWARDS.filter((r) => r.tierId === "fleetAdmiral")).toHaveLength(1);
    expect(REWARDS.filter((r) => r.tierId === "admiral")).toHaveLength(15);
    expect(REWARDS.filter((r) => r.tierId === "captain")).toHaveLength(15);
    expect(REWARDS.filter((r) => r.tierId === "commander")).toHaveLength(15);
    expect(REWARDS.filter((r) => r.tierId === "lieutenant")).toHaveLength(10);
    expect(REWARDS.filter((r) => r.tierId === "ensign")).toHaveLength(6);
  });

  it("uses the published schematic store and choice amounts", () => {
    expect(TIERS.map((t) => [t.id, t.storeCost, t.schematicChoice])).toEqual([
      ["fleetAdmiral", 2000, 500],
      ["admiral", 500, 200],
      ["captain", 200, 100],
      ["commander", 100, 50],
      ["lieutenant", 50, 20],
      ["ensign", 20, 5],
    ]);
  });

  it("uses livestream published 1-in-N tier odds", () => {
    expect(TIERS.map((t) => [t.oddsLabel, t.oneIn, t.publishedPercent])).toEqual(
      [
        ["Grand Prize", 100, 1],
        ["Admiral", 40, 2.5],
        ["Captain", 20, 5],
        ["Commander", 10, 10],
        ["Lieutenant", 4, 25],
        ["Ensign", 1.75, 57.143],
      ],
    );
  });
});

describe("pack simulator odds", () => {
  it("rolls with livestream tier weights and rarer tiers less often", () => {
    const odds = publishedTierOdds();
    const rollPercent = (tierId: string) => {
      const match = odds.find((entry) => entry.tierId === tierId);
      if (!match) throw new Error(`missing odds for ${tierId}`);
      return match.rollPercent;
    };
    expect(rollPercent("ensign")).toBeGreaterThan(rollPercent("lieutenant"));
    expect(rollPercent("lieutenant")).toBeGreaterThan(rollPercent("commander"));
    expect(rollPercent("commander")).toBeGreaterThan(rollPercent("captain"));
    expect(rollPercent("captain")).toBeGreaterThan(rollPercent("admiral"));
    expect(rollPercent("admiral")).toBeGreaterThan(rollPercent("fleetAdmiral"));
    expect(odds.reduce((sum, entry) => sum + entry.rollPercent, 0)).toBeCloseTo(
      100,
      5,
    );
    expect(odds.find((o) => o.tierId === "fleetAdmiral")?.publishedPercent).toBe(
      1,
    );
    expect(odds.find((o) => o.tierId === "ensign")?.oneIn).toBe(1.75);
  });

  it("can force a deterministic reward with a stubbed RNG", () => {
    const weighted = buildRewardWeights();
    const first = pickWeightedReward(() => 0, weighted);
    const last = pickWeightedReward(() => 0.999999, weighted);
    expect(first.id).toBe(weighted[0]!.reward.id);
    expect(last.id).toBe(weighted[weighted.length - 1]!.reward.id);
  });
});

describe("pack simulator flow", () => {
  it("defaults auto-take Schematics to off", () => {
    expect(createInitialState().autoTakeSchematics).toBe(false);
  });

  it("tracks Zen cost when buying offers and limits the 60-pack", () => {
    let state = createInitialState();
    state = purchasePacks(state, "single");
    expect(state.zenSpent).toBe(450);
    expect(state.unopenedPacks).toBe(1);

    state = purchasePacks(state, "twelve");
    expect(state.zenSpent).toBe(4950);
    expect(state.unopenedPacks).toBe(13);

    state = purchasePacks(state, "sixty");
    expect(state.zenSpent).toBe(27450);
    expect(state.unopenedPacks).toBe(73);
    expect(state.schematics).toBe(60);
    expect(state.boughtSixtyBundle).toBe(true);
    expect(canPurchase(state, "sixty").ok).toBe(false);
  });

  it("lets the player keep a prize or take Schematics", () => {
    const ensign = REWARDS.find((reward) => reward.id === "fleet-ship-module")!;
    let state = purchasePacks(createInitialState(), "single");
    state = setAutoTakeSchematics(state, false);
    state = openPack(state, randomForReward(ensign.id));
    expect(state.pending?.reward.id).toBe(ensign.id);

    state = takeSchematics(state);
    expect(state.pending).toBeNull();
    expect(state.schematics).toBe(5);
    expect(state.history[0]).toMatchObject({
      type: "schematics",
      rewardId: ensign.id,
      schematicsGained: 5,
    });

    state = purchasePacks(state, "single");
    state = openPack(state, randomForReward(ensign.id));
    state = keepReward(state);
    expect(ownedCount(state.inventory, ensign.id)).toBe(1);
  });

  it("auto-converts non-targets to Schematics and pauses on targets", () => {
    const target = shipRewards().find(
      (ship) => ship.id === "constitution-pilot-mmc",
    )!;
    const filler = REWARDS.find((reward) => reward.id === "fleet-ship-module")!;

    let state = createInitialState();
    state = toggleTarget(state, target.id);
    state = setAutoTakeSchematics(state, true);

    state = purchasePacks(state, "single");
    state = openPack(state, randomForReward(filler.id));
    expect(state.pending).toBeNull();
    expect(state.schematics).toBe(5);
    expect(allTargetsHit(state)).toBe(false);

    state = purchasePacks(state, "single");
    state = openPack(state, randomForReward(target.id));
    expect(state.pending?.reward.id).toBe(target.id);
    state = keepReward(state);
    expect(allTargetsHit(state)).toBe(true);
  });

  it("buys targeted ships from the Icon Store with Schematics", () => {
    const fleetShip = shipRewards().find(
      (ship) => ship.tierId === "lieutenant",
    )!;
    let state = createInitialState();
    state = {
      ...state,
      schematics: 50,
      targetRewardIds: [fleetShip.id],
    };
    state = buyFromStore(state, fleetShip.id);
    expect(state.schematics).toBe(0);
    expect(ownedCount(state.inventory, fleetShip.id)).toBe(1);
  });

  it("groups inventory by tier and reports Schematics value for kept prizes", () => {
    const ensign = REWARDS.find((reward) => reward.id === "fleet-ship-module")!;
    const lieutenant = shipRewards().find(
      (ship) => ship.tierId === "lieutenant",
    )!;
    let state = createInitialState();
    state = purchasePacks(state, "single");
    state = openPack(state, randomForReward(ensign.id));
    state = keepReward(state);
    state = purchasePacks(state, "single");
    state = openPack(state, randomForReward(lieutenant.id));
    state = keepReward(state);
    state = purchasePacks(state, "single");
    state = openPack(state, randomForReward(ensign.id));
    state = keepReward(state);

    expect(schematicsValueForEntry(state.inventory[0]!)).toBe(10);
    expect(totalInventorySchematicsValue(state.inventory)).toBe(30);

    const groups = groupInventoryByTier(state.inventory);
    expect(groups.map((group) => group.tierId)).toEqual([
      "lieutenant",
      "ensign",
    ]);
    expect(groups[0]?.schematicsValue).toBe(20);
    expect(groups[1]?.schematicsValue).toBe(10);
    expect(groups[1]?.entries[0]?.count).toBe(2);
  });

  it("Open all applies auto-take without prompting", () => {
    const target = shipRewards().find(
      (ship) => ship.id === "constitution-pilot-mmc",
    )!;
    const filler = REWARDS.find((reward) => reward.id === "fleet-ship-module")!;

    let withAuto = createInitialState();
    withAuto = toggleTarget(withAuto, target.id);
    withAuto = setAutoTakeSchematics(withAuto, true);
    withAuto = purchasePacks(withAuto, "twelve");
    // Force a mix: first filler (schematics), then target (kept), rest filler
    let call = 0;
    withAuto = openRemainingPacks(withAuto, () => {
      call += 1;
      if (call === 2) return randomForReward(target.id)();
      return randomForReward(filler.id)();
    });
    expect(withAuto.pending).toBeNull();
    expect(withAuto.unopenedPacks).toBe(0);
    expect(withAuto.packsOpened).toBe(12);
    expect(ownedCount(withAuto.inventory, target.id)).toBe(1);
    expect(withAuto.schematics).toBe(5 * 11);

    let withoutAuto = createInitialState();
    withoutAuto = purchasePacks(withoutAuto, "twelve");
    withoutAuto = openRemainingPacks(withoutAuto, randomForReward(filler.id));
    expect(withoutAuto.pending).toBeNull();
    expect(withoutAuto.unopenedPacks).toBe(0);
    expect(ownedCount(withoutAuto.inventory, filler.id)).toBe(12);
    expect(withoutAuto.schematics).toBe(0);
  });

  it("resets totals while preserving targets", () => {
    let state = createInitialState();
    const target = shipRewards()[3]!;
    state = toggleTarget(state, target.id);
    state = purchaseAndOpenAll(state, "twelve", () => 0.5);
    expect(state.zenSpent).toBeGreaterThan(0);

    state = resetSimulator(true, state);
    expect(state.zenSpent).toBe(0);
    expect(state.unopenedPacks).toBe(0);
    expect(state.inventory).toEqual([]);
    expect(state.targetRewardIds).toEqual([target.id]);
  });
});

describe("pack simulator target ship filter", () => {
  it("returns all ships when the query is empty or null (clearable field)", () => {
    const all = shipRewards();
    expect(filterPackTargetShips("")).toHaveLength(all.length);
    expect(filterPackTargetShips("   ")).toHaveLength(all.length);
    expect(filterPackTargetShips(null)).toHaveLength(all.length);
    expect(filterPackTargetShips(undefined)).toHaveLength(all.length);
  });

  it("filters by name including apostrophe-insensitive B'rel", () => {
    const hits = filterPackTargetShips("brel");
    expect(hits.some((ship) => /B'?rel/i.test(ship.name))).toBe(true);
    expect(filterPackTargetShips("B’rel").map((ship) => ship.id)).toEqual(
      filterPackTargetShips("B'rel").map((ship) => ship.id),
    );
  });

  it("filters by tier label", () => {
    const admiral = filterPackTargetShips("admiral");
    expect(admiral.length).toBeGreaterThan(0);
    expect(admiral.every((ship) => ship.tierId === "admiral" || ship.tierId === "fleetAdmiral")).toBe(
      true,
    );
  });
});
