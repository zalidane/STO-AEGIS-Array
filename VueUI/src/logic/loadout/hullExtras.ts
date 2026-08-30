import { parseBoffSeat } from "@/utils/parsers/boffSeat";

export type ExtraHullSlotShip = {
  tier?: number | null;
  boffs?: string | null;
  t5uConsole?: string | null;
};

export type T5uConsoleKind = "tactical" | "engineering" | "science";

export type ExtraHullSlotRule = {
  id: string;
  /** Shown on ship details and slot labels. */
  detailLabel: string;
  consoleLabel: string;
  traitLabel?: string;
  deviceLabel?: string;
  universalConsoles: number;
  tacticalConsoles?: number;
  engineeringConsoles?: number;
  scienceConsoles?: number;
  starshipTraits: number;
  devices: number;
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

export function isTier5Hull(tier: number | null | undefined): boolean {
  return tier === 5;
}

export function isTier6Hull(tier: number | null | undefined): boolean {
  return tier === 6;
}

/** Wiki cargo `t5uconsole`: tac / eng / sci. */
export function parseT5uConsole(
  value: string | null | undefined,
): T5uConsoleKind | null {
  const needle = value?.trim().toLowerCase();
  if (needle === "tac" || needle === "tactical") return "tactical";
  if (needle === "eng" || needle === "engineering") return "engineering";
  if (needle === "sci" || needle === "science") return "science";
  return null;
}

function t5uUpgradeRule(ship: ExtraHullSlotShip): ExtraHullSlotRule | null {
  if (!isTier5Hull(ship.tier)) return null;
  const kind = parseT5uConsole(ship.t5uConsole);
  if (!kind) return null;
  const careerLabel =
    kind === "tactical"
      ? "Tactical"
      : kind === "engineering"
        ? "Engineering"
        : "Science";
  return {
    id: "t5-u",
    detailLabel: "T5-U",
    consoleLabel: `${careerLabel} (T5-U)`,
    universalConsoles: 0,
    tacticalConsoles: kind === "tactical" ? 1 : 0,
    engineeringConsoles: kind === "engineering" ? 1 : 0,
    scienceConsoles: kind === "science" ? 1 : 0,
    starshipTraits: 0,
    devices: 0,
    matches: () => true,
  };
}

/**
 * Extra sockets beyond wiki Tac/Eng/Sci, devices, and granted traits.
 * Append a rule here when another hull bonus should add consoles,
 * device slots, or empty starship trait slots.
 */
export const HULL_EXTRA_SLOT_RULES: ExtraHullSlotRule[] = [
  {
    id: "t5-x",
    detailLabel: "T5-X",
    consoleLabel: "Universal (T5-X)",
    traitLabel: "Starship Trait (T5-X)",
    deviceLabel: "Device (T5-X)",
    universalConsoles: 1,
    starshipTraits: 1,
    devices: 1,
    matches: (ship) =>
      isTier5Hull(ship.tier) && parseT5uConsole(ship.t5uConsole) != null,
  },
  {
    id: "t5-x2",
    detailLabel: "T5-X2",
    consoleLabel: "Universal (T5-X2)",
    traitLabel: "Starship Trait (T5-X2)",
    deviceLabel: "Device (T5-X2)",
    universalConsoles: 1,
    starshipTraits: 1,
    devices: 1,
    matches: (ship) =>
      isTier5Hull(ship.tier) && parseT5uConsole(ship.t5uConsole) != null,
  },
  {
    id: "t6-x",
    detailLabel: "T6-X",
    consoleLabel: "Universal (T6-X)",
    traitLabel: "Starship Trait (T6-X)",
    deviceLabel: "Device (T6-X)",
    universalConsoles: 1,
    starshipTraits: 1,
    devices: 1,
    matches: (ship) => isTier6Hull(ship.tier),
  },
  {
    id: "t6-x2",
    detailLabel: "T6-X2",
    consoleLabel: "Universal (T6-X2)",
    traitLabel: "Starship Trait (T6-X2)",
    deviceLabel: "Device (T6-X2)",
    universalConsoles: 1,
    starshipTraits: 1,
    devices: 1,
    matches: (ship) => isTier6Hull(ship.tier),
  },
  {
    id: "commander-miracle-worker",
    detailLabel: "Commander Miracle Worker",
    consoleLabel: "Universal (Miracle Worker)",
    universalConsoles: 1,
    starshipTraits: 0,
    devices: 0,
    matches: (ship) => hasCommanderMiracleWorkerSeat(ship.boffs),
  },
];

export type ExtraHullSlotSummary = {
  universalConsoles: number;
  tacticalConsoles: number;
  engineeringConsoles: number;
  scienceConsoles: number;
  starshipTraits: number;
  devices: number;
  rules: ExtraHullSlotRule[];
};

function sumCareer(
  rules: ReadonlyArray<ExtraHullSlotRule>,
  key: "tacticalConsoles" | "engineeringConsoles" | "scienceConsoles",
): number {
  return rules.reduce((total, rule) => total + (rule[key] ?? 0), 0);
}

export function extraHullSlotSummary(
  ship: ExtraHullSlotShip,
): ExtraHullSlotSummary {
  const t5u = t5uUpgradeRule(ship);
  const rules = [
    ...(t5u ? [t5u] : []),
    ...HULL_EXTRA_SLOT_RULES.filter((rule) => rule.matches(ship)),
  ];
  return {
    universalConsoles: rules.reduce(
      (total, rule) => total + rule.universalConsoles,
      0,
    ),
    tacticalConsoles: sumCareer(rules, "tacticalConsoles"),
    engineeringConsoles: sumCareer(rules, "engineeringConsoles"),
    scienceConsoles: sumCareer(rules, "scienceConsoles"),
    starshipTraits: rules.reduce(
      (total, rule) => total + rule.starshipTraits,
      0,
    ),
    devices: rules.reduce((total, rule) => total + rule.devices, 0),
    rules,
  };
}

export function extraSlotReasonLabel(summary: ExtraHullSlotSummary): string {
  if (summary.rules.length === 0) return "";
  return summary.rules.map((rule) => rule.detailLabel).join(", ");
}
