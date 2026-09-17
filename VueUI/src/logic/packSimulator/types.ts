export type RewardTierId =
  | "fleetAdmiral"
  | "admiral"
  | "captain"
  | "commander"
  | "lieutenant"
  | "ensign";

export type RewardKind = "ship" | "item";

export type PackOfferId = "single" | "twelve" | "sixty";

export type RewardDefinition = {
  id: string;
  name: string;
  tierId: RewardTierId;
  kind: RewardKind;
};

export type TierDefinition = {
  id: RewardTierId;
  label: string;
  storeCost: number;
  schematicChoice: number;
};

export type PackOffer = {
  id: PackOfferId;
  label: string;
  zenCost: number;
  packCount: number;
  bonusSchematics: number;
  oncePerAccount: boolean;
};

export type OwnedReward = {
  rewardId: string;
  name: string;
  tierId: RewardTierId;
  kind: RewardKind;
  count: number;
};

export type OpenResult = {
  reward: RewardDefinition;
  schematicChoice: number;
};

export type PendingOpen = OpenResult & {
  openedAt: number;
};

export type SimulatorEvent =
  | {
      type: "purchase";
      offerId: PackOfferId;
      zenSpent: number;
      packsAdded: number;
      bonusSchematics: number;
    }
  | {
      type: "kept";
      rewardId: string;
      rewardName: string;
      tierId: RewardTierId;
    }
  | {
      type: "schematics";
      rewardId: string;
      rewardName: string;
      tierId: RewardTierId;
      schematicsGained: number;
    }
  | {
      type: "storePurchase";
      rewardId: string;
      rewardName: string;
      schematicsSpent: number;
    };

export type SimulatorState = {
  zenSpent: number;
  schematics: number;
  unopenedPacks: number;
  packsOpened: number;
  boughtSixtyBundle: boolean;
  pending: PendingOpen | null;
  inventory: OwnedReward[];
  targetRewardIds: string[];
  autoTakeSchematics: boolean;
  history: SimulatorEvent[];
};
