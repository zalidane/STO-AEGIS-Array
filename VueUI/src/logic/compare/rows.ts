import { hasCommanderMiracleWorkerSeat } from "@/logic/loadout/hullExtras";
import { toBoffSeatView } from "@/mappers/boffColors";
import { formatYesNo } from "@/utils/formatters";
import { parseShipCost } from "@/utils/parsers/shipCost";

export type CompareAdvantage = "left" | "right" | null;

export type CompareRow = {
  key: string;
  label: string;
  left: string;
  right: string;
  differs: boolean;
  advantage: CompareAdvantage;
  /** Seat (or other value) also exists on the other hull, even in another row. */
  leftMatch: boolean;
  rightMatch: boolean;
};

export type CompareSection = {
  id: string;
  title: string;
  rows: CompareRow[];
};

export type CompareHull = {
  id: number;
  name: string;
  image?: string | null;
  type?: string | null;
  tier?: number | null;
  hull?: string | number | null;
  hullMod?: number | null;
  shieldMod?: number | null;
  turnRate?: number | null;
  impulse?: number | null;
  inertia?: number | null;
  powerAll?: number | null;
  powerWeapons?: number | null;
  powerShields?: number | null;
  powerEngines?: number | null;
  powerAuxiliary?: number | null;
  foreWeapons?: number | null;
  aftWeapons?: number | null;
  experimental?: boolean | null;
  equipCannons?: boolean | number | string | null;
  devices?: number | null;
  hangars?: number | null;
  secondaryDeflector?: boolean | null;
  tacticalSlots?: number | null;
  engineeringSlots?: number | null;
  scienceSlots?: number | null;
  t5uConsole?: string | null;
  boffs?: string | null;
  cost?: string | null;
  uniconsole?: string | null;
  experimentalWeapon?: string | null;
  abilities?: string | null;
};

export function parseCompareNumber(
  value: string | number | null | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(value);
}

function formatStat(value: string | number | null | undefined): string {
  const n = parseCompareNumber(value);
  if (n != null) return n.toLocaleString();
  const text = value == null ? "" : String(value).trim();
  return text.length > 0 ? text : "—";
}

function powerValue(
  specific: number | null | undefined,
  all: number | null | undefined,
): number | null {
  if (specific != null && Number.isFinite(specific)) return specific;
  if (all != null && Number.isFinite(all)) return all;
  return null;
}

function numericRow(
  key: string,
  label: string,
  left: number | null,
  right: number | null,
  higherIsBetter: boolean,
): CompareRow {
  const leftText = left == null ? "—" : formatStat(left);
  const rightText = right == null ? "—" : formatStat(right);
  const differs = leftText !== rightText;
  let advantage: CompareAdvantage = null;
  if (differs && left != null && right != null) {
    if (left === right) advantage = null;
    else if (higherIsBetter) advantage = left > right ? "left" : "right";
    else advantage = left < right ? "left" : "right";
  }
  return {
    key,
    label,
    left: leftText,
    right: rightText,
    differs,
    advantage,
    leftMatch: false,
    rightMatch: false,
  };
}

function textRow(
  key: string,
  label: string,
  left: string,
  right: string,
  matches?: { leftMatch?: boolean; rightMatch?: boolean },
): CompareRow {
  const leftText = left.trim() || "—";
  const rightText = right.trim() || "—";
  return {
    key,
    label,
    left: leftText,
    right: rightText,
    differs: leftText !== rightText,
    advantage: null,
    leftMatch: matches?.leftMatch === true,
    rightMatch: matches?.rightMatch === true,
  };
}

function boolRow(
  key: string,
  label: string,
  left: boolean | number | string | null | undefined,
  right: boolean | number | string | null | undefined,
): CompareRow {
  const leftText = formatYesNo(left);
  const rightText = formatYesNo(right);
  const leftYes = leftText === "Yes";
  const rightYes = rightText === "Yes";
  const differs = leftText !== rightText;
  let advantage: CompareAdvantage = null;
  if (differs && leftYes !== rightYes) {
    advantage = leftYes ? "left" : "right";
  }
  return {
    key,
    label,
    left: leftText,
    right: rightText,
    differs,
    advantage,
    leftMatch: false,
    rightMatch: false,
  };
}

function padPair(left: string[], right: string[]): Array<[string, string]> {
  const size = Math.max(left.length, right.length);
  return Array.from({ length: size }, (_, index) => [
    left[index] ?? "—",
    right[index] ?? "—",
  ]);
}

function boffLabels(boffs: string | null | undefined): string[] {
  if (!boffs?.trim()) return [];
  return boffs
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((raw) => toBoffSeatView(raw).label);
}

/** True for each seat that the other hull also has, consuming duplicates in order. */
export function seatMatchFlags(
  seats: readonly string[],
  otherSeats: readonly string[],
): boolean[] {
  const remaining = new Map<string, number>();
  for (const seat of otherSeats) {
    if (seat === "—") continue;
    remaining.set(seat, (remaining.get(seat) ?? 0) + 1);
  }
  return seats.map((seat) => {
    if (seat === "—") return false;
    const count = remaining.get(seat) ?? 0;
    if (count <= 0) return false;
    remaining.set(seat, count - 1);
    return true;
  });
}

function abilityLines(abilities: string | null | undefined): string[] {
  if (!abilities?.trim()) return [];
  return abilities
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Wiki slot counts only. T5-U / T6-X extras are upgrades, not stock. */
function stockSlotCounts(ship: CompareHull) {
  return {
    engineering: ship.engineeringSlots ?? 0,
    science: ship.scienceSlots ?? 0,
    tactical: ship.tacticalSlots ?? 0,
    universal: hasCommanderMiracleWorkerSeat(ship.boffs) ? 1 : 0,
    devices: ship.devices ?? 0,
  };
}

export function buildPhysicalStatRows(
  left: CompareHull,
  right: CompareHull,
): CompareRow[] {
  return [
    numericRow(
      "hull",
      "Hull",
      parseCompareNumber(left.hull),
      parseCompareNumber(right.hull),
      true,
    ),
    numericRow("hullMod", "Hull Mod", left.hullMod ?? null, right.hullMod ?? null, true),
    numericRow(
      "shieldMod",
      "Shield Mod",
      left.shieldMod ?? null,
      right.shieldMod ?? null,
      true,
    ),
    numericRow(
      "turnRate",
      "Turn Rate",
      left.turnRate ?? null,
      right.turnRate ?? null,
      true,
    ),
    numericRow("impulse", "Impulse", left.impulse ?? null, right.impulse ?? null, true),
    numericRow(
      "inertia",
      "Inertia",
      left.inertia ?? null,
      right.inertia ?? null,
      false,
    ),
    numericRow(
      "powerWeapons",
      "Weapon Power",
      powerValue(left.powerWeapons, left.powerAll),
      powerValue(right.powerWeapons, right.powerAll),
      true,
    ),
    numericRow(
      "powerShields",
      "Shield Power",
      powerValue(left.powerShields, left.powerAll),
      powerValue(right.powerShields, right.powerAll),
      true,
    ),
    numericRow(
      "powerEngines",
      "Engine Power",
      powerValue(left.powerEngines, left.powerAll),
      powerValue(right.powerEngines, right.powerAll),
      true,
    ),
    numericRow(
      "powerAuxiliary",
      "Auxiliary Power",
      powerValue(left.powerAuxiliary, left.powerAll),
      powerValue(right.powerAuxiliary, right.powerAll),
      true,
    ),
  ];
}

export function buildWeaponSlotRows(
  left: CompareHull,
  right: CompareHull,
): CompareRow[] {
  return [
    numericRow(
      "fore",
      "Fore Weapons",
      left.foreWeapons ?? null,
      right.foreWeapons ?? null,
      true,
    ),
    numericRow(
      "aft",
      "Aft Weapons",
      left.aftWeapons ?? null,
      right.aftWeapons ?? null,
      true,
    ),
    boolRow("experimental", "Experimental Weapon", left.experimental, right.experimental),
    boolRow("cannons", "Cannons", left.equipCannons, right.equipCannons),
  ];
}

export function buildBoffRows(
  left: CompareHull,
  right: CompareHull,
): CompareRow[] {
  const leftSeats = boffLabels(left.boffs);
  const rightSeats = boffLabels(right.boffs);
  const leftFlags = seatMatchFlags(leftSeats, rightSeats);
  const rightFlags = seatMatchFlags(rightSeats, leftSeats);
  const pairs = padPair(leftSeats, rightSeats);
  if (pairs.length === 0) {
    return [textRow("boff-empty", "Seats", "—", "—")];
  }
  return pairs.map(([leftText, rightText], index) =>
    textRow(`boff-${index}`, `Seat ${index + 1}`, leftText, rightText, {
      leftMatch: leftFlags[index] === true,
      rightMatch: rightFlags[index] === true,
    }),
  );
}

export function buildConsoleSlotRows(
  left: CompareHull,
  right: CompareHull,
): CompareRow[] {
  const leftConsoles = stockSlotCounts(left);
  const rightConsoles = stockSlotCounts(right);
  return [
    numericRow(
      "eng",
      "Engineering Consoles",
      leftConsoles.engineering,
      rightConsoles.engineering,
      true,
    ),
    numericRow(
      "sci",
      "Science Consoles",
      leftConsoles.science,
      rightConsoles.science,
      true,
    ),
    numericRow(
      "tac",
      "Tactical Consoles",
      leftConsoles.tactical,
      rightConsoles.tactical,
      true,
    ),
    numericRow(
      "uni",
      "Universal Consoles",
      leftConsoles.universal,
      rightConsoles.universal,
      true,
    ),
  ];
}

export function buildAccessoryRows(
  left: CompareHull,
  right: CompareHull,
): CompareRow[] {
  const leftConsoles = stockSlotCounts(left);
  const rightConsoles = stockSlotCounts(right);
  const abilityPairs = padPair(
    abilityLines(left.abilities),
    abilityLines(right.abilities),
  );
  const rows: CompareRow[] = [
    numericRow(
      "devices",
      "Devices",
      leftConsoles.devices,
      rightConsoles.devices,
      true,
    ),
    numericRow("hangars", "Hangars", left.hangars ?? 0, right.hangars ?? 0, true),
    boolRow(
      "secondaryDeflector",
      "Secondary Deflector",
      left.secondaryDeflector,
      right.secondaryDeflector,
    ),
    textRow("uniqueConsole", "Unique Console", left.uniconsole ?? "", right.uniconsole ?? ""),
    textRow(
      "expWeapon",
      "Experimental Weapon",
      left.experimentalWeapon ?? "",
      right.experimentalWeapon ?? "",
    ),
  ];
  abilityPairs.forEach(([leftText, rightText], index) => {
    rows.push(textRow(`ability-${index}`, `Ability ${index + 1}`, leftText, rightText));
  });
  return rows;
}

export function buildCostRows(
  left: CompareHull,
  right: CompareHull,
): CompareRow[] {
  const leftCosts = parseShipCost(left.cost);
  const rightCosts = parseShipCost(right.cost);
  const keys = [
    ...new Set([
      ...leftCosts.map((cost) => cost.currencyCode),
      ...rightCosts.map((cost) => cost.currencyCode),
    ]),
  ];
  if (keys.length === 0) {
    return [textRow("cost-empty", "Cost", "—", "—")];
  }
  return keys.map((code) => {
    const leftCost = leftCosts.find((cost) => cost.currencyCode === code);
    const rightCost = rightCosts.find((cost) => cost.currencyCode === code);
    const label = leftCost?.label ?? rightCost?.label ?? code;
    return textRow(
      `cost-${code}`,
      label,
      leftCost ? `${leftCost.amount} ${leftCost.label}` : "—",
      rightCost ? `${rightCost.amount} ${rightCost.label}` : "—",
    );
  });
}

export function buildCompareSections(
  left: CompareHull,
  right: CompareHull,
): CompareSection[] {
  return [
    { id: "physical", title: "Physical stats", rows: buildPhysicalStatRows(left, right) },
    { id: "weapons", title: "Weapon slots", rows: buildWeaponSlotRows(left, right) },
    { id: "boffs", title: "BOff seating", rows: buildBoffRows(left, right) },
    { id: "consoles", title: "Console slots", rows: buildConsoleSlotRows(left, right) },
    { id: "accessories", title: "Accessories", rows: buildAccessoryRows(left, right) },
    { id: "costs", title: "Cost", rows: buildCostRows(left, right) },
  ];
}
