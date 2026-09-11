import {
  extraHullSlotSummary,
  type ExtraHullSlotShip,
} from "./hullExtras";
import type { HullSlot } from "./hullSlots";

export const HULL_UPGRADE_LEVELS = ["full", "x", "u", "stock"] as const;

export type HullUpgradeLevel = (typeof HULL_UPGRADE_LEVELS)[number];

export const EXTRA_SLOT_DISPLAYS = ["hide", "lock"] as const;

export type ExtraSlotDisplay = (typeof EXTRA_SLOT_DISPLAYS)[number];

/** Per-build board options. Omitted fields keep the current fully-upgraded UI. */
export type LoadoutBoardPrefs = {
  /** Nested X-pack / T5-U extras. Default `full`. */
  hullUpgrade?: HullUpgradeLevel;
  /** Commander Miracle Worker universal console. Default true. */
  miracleWorkerConsole?: boolean;
  /** Locked extras: omit from the board, or show them disabled. Default `hide`. */
  extraSlotDisplay?: ExtraSlotDisplay;
  /** Hide quality / mark / suffix pickers. Tokens stay on the fill. */
  hideModifiers?: boolean;
};

export type HullUpgradeChoice = {
  value: HullUpgradeLevel;
  title: string;
};

const UPGRADE_LEVELS = new Set<string>(HULL_UPGRADE_LEVELS);
const DISPLAYS = new Set<string>(EXTRA_SLOT_DISPLAYS);

function isUpgradeLevel(value: string): value is HullUpgradeLevel {
  return UPGRADE_LEVELS.has(value);
}

function isDisplay(value: string): value is ExtraSlotDisplay {
  return DISPLAYS.has(value);
}

export function sanitizeBoardPrefs(
  value: unknown,
): LoadoutBoardPrefs | undefined {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const row = value as Record<string, unknown>;
  const prefs: LoadoutBoardPrefs = {};
  if (typeof row.hullUpgrade === "string" && isUpgradeLevel(row.hullUpgrade)) {
    prefs.hullUpgrade = row.hullUpgrade;
  }
  if (typeof row.miracleWorkerConsole === "boolean") {
    prefs.miracleWorkerConsole = row.miracleWorkerConsole;
  }
  if (
    typeof row.extraSlotDisplay === "string" &&
    isDisplay(row.extraSlotDisplay)
  ) {
    prefs.extraSlotDisplay = row.extraSlotDisplay;
  }
  if (typeof row.hideModifiers === "boolean") {
    prefs.hideModifiers = row.hideModifiers;
  }
  return Object.keys(prefs).length > 0 ? prefs : undefined;
}

export function isDefaultBoardPrefs(
  prefs: LoadoutBoardPrefs | null | undefined,
): boolean {
  if (!prefs) return true;
  return (
    (prefs.hullUpgrade ?? "full") === "full" &&
    prefs.miracleWorkerConsole !== false &&
    (prefs.extraSlotDisplay ?? "hide") === "hide" &&
    prefs.hideModifiers !== true
  );
}

export function compactBoardPrefs(
  prefs: LoadoutBoardPrefs | null | undefined,
): LoadoutBoardPrefs | undefined {
  const sanitized = sanitizeBoardPrefs(prefs);
  if (!sanitized || isDefaultBoardPrefs(sanitized)) return undefined;
  return sanitized;
}

export function mergeBoardPrefs(
  current: LoadoutBoardPrefs | null | undefined,
  patch: LoadoutBoardPrefs,
): LoadoutBoardPrefs | undefined {
  return compactBoardPrefs({ ...current, ...patch });
}

export function hullHasUpgradeExtras(ship: ExtraHullSlotShip): boolean {
  return extraHullSlotSummary(ship).rules.some(
    (rule) => rule.id !== "commander-miracle-worker",
  );
}

export function hullHasMiracleWorkerConsole(ship: ExtraHullSlotShip): boolean {
  return extraHullSlotSummary(ship).rules.some(
    (rule) => rule.id === "commander-miracle-worker",
  );
}

export function hullUpgradeChoices(ship: ExtraHullSlotShip): HullUpgradeChoice[] {
  if (isTier6Ship(ship)) {
    return [
      { value: "full", title: "T6-X2 (full)" },
      { value: "x", title: "T6-X" },
      { value: "stock", title: "Stock (no X-pack)" },
    ];
  }
  if (isTier5Upgradeable(ship)) {
    return [
      { value: "full", title: "T5-X2 (full)" },
      { value: "x", title: "T5-X" },
      { value: "u", title: "T5-U" },
      { value: "stock", title: "Stock (no upgrades)" },
    ];
  }
  return [];
}

function isTier6Ship(ship: ExtraHullSlotShip): boolean {
  return extraHullSlotSummary(ship).rules.some((rule) =>
    rule.id.startsWith("t6-"),
  );
}

function isTier5Upgradeable(ship: ExtraHullSlotShip): boolean {
  return extraHullSlotSummary(ship).rules.some((rule) =>
    rule.id.startsWith("t5-"),
  );
}

/**
 * Extra rule ids this build has unlocked. Missing prefs = all extras (legacy).
 */
export function unlockedExtraRuleIds(
  ship: ExtraHullSlotShip,
  prefs: LoadoutBoardPrefs | null | undefined,
): Set<string> {
  const present = extraHullSlotSummary(ship).rules.map((rule) => rule.id);
  const has = (id: string) => present.includes(id);
  const unlocked = new Set<string>();
  const level = prefs?.hullUpgrade ?? "full";

  if (level === "full") {
    for (const id of present) {
      if (id !== "commander-miracle-worker") unlocked.add(id);
    }
  } else if (level === "x") {
    if (has("t6-x")) unlocked.add("t6-x");
    if (has("t5-u")) unlocked.add("t5-u");
    if (has("t5-x")) unlocked.add("t5-x");
  } else if (level === "u") {
    if (has("t5-u")) unlocked.add("t5-u");
  }

  if (prefs?.miracleWorkerConsole !== false && has("commander-miracle-worker")) {
    unlocked.add("commander-miracle-worker");
  }
  return unlocked;
}

/**
 * Hide or lock extra sockets the captain has not unlocked.
 * Slots without `extraRuleId` are always kept.
 */
export function applyBoardPrefsToHullSlots(
  slots: readonly HullSlot[],
  prefs: LoadoutBoardPrefs | null | undefined,
  ship: ExtraHullSlotShip,
): HullSlot[] {
  const unlocked = unlockedExtraRuleIds(ship, prefs);
  const display = prefs?.extraSlotDisplay ?? "hide";
  const next: HullSlot[] = [];
  for (const slot of slots) {
    if (!slot.extraRuleId || unlocked.has(slot.extraRuleId)) {
      next.push(slot);
      continue;
    }
    if (display === "lock") {
      next.push({ ...slot, locked: true });
    }
  }
  return next;
}

export function slotAcceptsFills(slot: Pick<HullSlot, "locked">): boolean {
  return slot.locked !== true;
}
