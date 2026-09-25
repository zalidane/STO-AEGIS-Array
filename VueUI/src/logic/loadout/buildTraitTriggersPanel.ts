import {
  crossRefTraitTriggersAgainstLoadout,
  orderTraitTriggersForPanel,
  type CollectSeatedTriggerFillsInput,
  type TraitTriggerSatisfaction,
} from "@/logic/loadout/crossRefTraitTriggers";
import {
  extractTraitTriggers,
  type TraitTriggerTextSource,
} from "@/logic/loadout/extractTraitTriggers";
import { fillCatalogKind } from "@/logic/loadout/setBonus";
import type {
  LoadoutCatalogKind,
  LoadoutItem,
  LoadoutSlotFill,
} from "@/logic/loadout/types";

/**
 * Assemble per-trait trigger status for loadout trait icons.
 * Pure logic — presentation lives on CaptainTraitsPanel icons.
 */

export type TraitTriggerPanelCatalogKind = "trait" | "starshipTrait";

/** Hover / icon status for one seated personal or starship trait. */
export type TraitTriggerIconStatus = {
  traitId: number;
  traitName: string;
  catalogKind: TraitTriggerPanelCatalogKind;
  image?: string | null;
  slotId: string;
  /** Trait short description (line 2 of the hover popup). */
  shortDescription: string;
  /** Ordered trigger clauses used to compute aggregate status. */
  triggers: TraitTriggerSatisfaction[];
  /** Aggregate: every trigger clause is satisfied. */
  satisfied: boolean;
  /** Line 3 of the hover popup — satisfied by / unsatisfied needs. */
  statusLine: string;
};

/** @deprecated Prefer {@link TraitTriggerIconStatus}; kept for test migration. */
export type TraitTriggerPanelRow = TraitTriggerIconStatus;

export type BuildTraitTriggersPanelInput = {
  slots: ReadonlyArray<LoadoutSlotFill>;
  catalog: ReadonlyArray<LoadoutItem>;
  hullSlots?: CollectSeatedTriggerFillsInput["hullSlots"];
  captainPowers?: CollectSeatedTriggerFillsInput["captainPowers"];
};

function isTraitCatalogKind(
  kind: LoadoutCatalogKind,
): kind is TraitTriggerPanelCatalogKind {
  return kind === "trait" || kind === "starshipTrait";
}

function catalogKey(kind: LoadoutCatalogKind, id: number): string {
  return `${kind}:${id}`;
}

/**
 * Map personal-trait Cargo fields onto the #31 text source shape.
 * Starship traits already use short / basic / detailed.
 */
export function traitTextSourceFromItem(
  item: Pick<
    LoadoutItem,
    "name" | "short" | "basic" | "detailed" | "catalogKind"
  >,
): TraitTriggerTextSource {
  return {
    name: item.name,
    short: item.short ?? null,
    basic: item.basic ?? null,
    detailed: item.detailed ?? null,
  };
}

/**
 * Map a personal Trait GraphQL / Cargo row onto #31 fields.
 * `shortDescription` → short; `description` → basic.
 */
export function personalTraitToTriggerText(row: {
  name?: string | null;
  shortDescription?: string | null;
  description?: string | null;
}): TraitTriggerTextSource {
  return {
    name: row.name ?? null,
    short: row.shortDescription ?? null,
    basic: row.description ?? null,
    detailed: null,
  };
}

/** ✓ / ✗ for resolvable triggers; `null` only when satisfaction is unknown. */
export function traitTriggerSatisfactionMark(
  satisfied: boolean | null,
): "✓" | "✗" | null {
  if (satisfied === null) return null;
  return satisfied ? "✓" : "✗";
}

/** CSS-friendly state token for icon / tooltip styling. */
export function traitTriggerSatisfactionState(
  satisfied: boolean | null,
): "satisfied" | "unsatisfied" | "descriptive" {
  if (satisfied === null) return "descriptive";
  return satisfied ? "satisfied" : "unsatisfied";
}

function uniqueNames(names: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Aggregate hover line 3 from ordered trigger clauses.
 */
export function formatTraitTriggerStatusLine(
  triggers: ReadonlyArray<TraitTriggerSatisfaction>,
): string {
  if (triggers.length === 0) return "";

  const unsatisfied = triggers.filter((t) => t.satisfied === false);
  if (unsatisfied.length > 0) {
    return `Unsatisfied: needs ${unsatisfied.map((t) => t.label).join(", ")}`;
  }

  const matchNames = uniqueNames(
    triggers.flatMap((t) => t.matchedItems.map((item) => item.name)),
  );
  if (matchNames.length > 0) {
    return `Satisfied by: ${matchNames.join(", ")}`;
  }

  const combat = triggers.find((t) => t.kind === "combatState");
  if (combat) {
    return `Satisfied: ${combat.label}`;
  }

  return "Satisfied";
}

/**
 * Trait is satisfied when every extracted trigger clause is satisfied.
 * Empty trigger lists are not shown on icons (caller skips them).
 */
export function aggregateTraitTriggerSatisfied(
  triggers: ReadonlyArray<TraitTriggerSatisfaction>,
): boolean {
  if (triggers.length === 0) return false;
  return triggers.every((t) => t.satisfied === true);
}

/**
 * Build icon-status rows for every seated personal / starship trait that has
 * at least one structured trigger. Empty when none apply.
 */
export function buildTraitTriggersPanel(
  input: BuildTraitTriggersPanelInput,
): TraitTriggerIconStatus[] {
  const byKey = new Map(
    input.catalog.map((item) => [
      catalogKey(item.catalogKind ?? "item", item.id),
      item,
    ]),
  );

  const loadoutInput: CollectSeatedTriggerFillsInput = {
    slots: input.slots,
    catalog: input.catalog,
    hullSlots: input.hullSlots,
    captainPowers: input.captainPowers,
  };

  const rows: TraitTriggerIconStatus[] = [];

  for (const slotFill of input.slots) {
    const kind = fillCatalogKind(slotFill);
    if (!isTraitCatalogKind(kind)) continue;

    const item = byKey.get(catalogKey(kind, slotFill.itemId));
    if (!item) continue;

    const triggers = orderTraitTriggersForPanel(
      crossRefTraitTriggersAgainstLoadout(
        extractTraitTriggers(traitTextSourceFromItem(item)),
        loadoutInput,
      ),
    );

    if (triggers.length === 0) continue;

    const satisfied = aggregateTraitTriggerSatisfied(triggers);
    rows.push({
      traitId: item.id,
      traitName: item.name,
      catalogKind: kind,
      image: item.image,
      slotId: slotFill.slotId,
      shortDescription: (item.short ?? item.basic ?? "").trim(),
      triggers,
      satisfied,
      statusLine: formatTraitTriggerStatusLine(triggers),
    });
  }

  return rows;
}

/** Map of seat id → icon status for CaptainTraitsPanel. */
export function traitTriggerStatusBySlotId(
  rows: ReadonlyArray<TraitTriggerIconStatus>,
): Record<string, TraitTriggerIconStatus> {
  const out: Record<string, TraitTriggerIconStatus> = {};
  for (const row of rows) {
    out[row.slotId] = row;
  }
  return out;
}
