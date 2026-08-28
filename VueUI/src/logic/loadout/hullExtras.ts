import { parseBoffSeat } from "@/utils/parsers/boffSeat";

export type ExtraHullSlotShip = {
  tier?: number | null;
  boffs?: string | null;
};

export type ExtraHullSlotRule = {
  id: string;
  /** Shown on ship details and slot labels. */
  detailLabel: string;
  consoleLabel: string;
  traitLabel?: string;
  universalConsoles: number;
  starshipTraits: number;
  matches: (ship: ExtraHullSlotShip) => boolean;
};

function isCommanderRank(rank: string): boolean {
  return rank.trim().toLowerCase() === "commander";
}

function isMiracleWorkerSpec(specialization: string | undefined): boolean {
  return specialization?.trim().toLowerCase() === "miracle worker";
}

export function hasCommanderMiracleWorkerSeat(
  boffs: string | null | undefined,
): boolean {
  if (!boffs?.trim()) return false;
  return boffs
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseBoffSeat)
    .some(
      (seat) =>
        isCommanderRank(seat.rank) && isMiracleWorkerSpec(seat.specialization),
    );
}

export function isTier6Hull(tier: number | null | undefined): boolean {
  return tier === 6;
}

/**
 * Extra sockets beyond wiki Tac/Eng/Sci and granted traits.
 * Append a rule here when another hull bonus should add universal consoles
 * or empty starship trait slots.
 */
export const HULL_EXTRA_SLOT_RULES: ExtraHullSlotRule[] = [
  {
    id: "t6-x",
    detailLabel: "T6-X",
    consoleLabel: "Universal (T6-X)",
    traitLabel: "Starship Trait (T6-X)",
    universalConsoles: 1,
    starshipTraits: 1,
    matches: (ship) => isTier6Hull(ship.tier),
  },
  {
    id: "t6-x2",
    detailLabel: "T6-X2",
    consoleLabel: "Universal (T6-X2)",
    traitLabel: "Starship Trait (T6-X2)",
    universalConsoles: 1,
    starshipTraits: 1,
    matches: (ship) => isTier6Hull(ship.tier),
  },
  {
    id: "commander-miracle-worker",
    detailLabel: "Commander Miracle Worker",
    consoleLabel: "Universal (Miracle Worker)",
    universalConsoles: 1,
    starshipTraits: 0,
    matches: (ship) => hasCommanderMiracleWorkerSeat(ship.boffs),
  },
];

export type ExtraHullSlotSummary = {
  universalConsoles: number;
  starshipTraits: number;
  rules: ExtraHullSlotRule[];
};

export function extraHullSlotSummary(
  ship: ExtraHullSlotShip,
): ExtraHullSlotSummary {
  const rules = HULL_EXTRA_SLOT_RULES.filter((rule) => rule.matches(ship));
  return {
    universalConsoles: rules.reduce(
      (total, rule) => total + rule.universalConsoles,
      0,
    ),
    starshipTraits: rules.reduce(
      (total, rule) => total + rule.starshipTraits,
      0,
    ),
    rules,
  };
}

export function extraSlotReasonLabel(summary: ExtraHullSlotSummary): string {
  if (summary.rules.length === 0) return "";
  return summary.rules.map((rule) => rule.detailLabel).join(", ");
}
