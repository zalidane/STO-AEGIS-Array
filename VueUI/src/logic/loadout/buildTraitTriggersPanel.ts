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
 * Assemble Trait Triggers panel rows for the loadout builder (#33).
 * Pure logic — presentation lives in TraitTriggersPanel.vue.
 */

export type TraitTriggerPanelCatalogKind = "trait" | "starshipTrait";

/** One seated trait with ordered, satisfied trigger clauses. */
export type TraitTriggerPanelRow = {
  traitId: number;
  traitName: string;
  catalogKind: TraitTriggerPanelCatalogKind;
  image?: string | null;
  slotId: string;
  triggers: TraitTriggerSatisfaction[];
};

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

/** ✓ / ✗ for resolvable triggers; `null` for combat-state / descriptive-only. */
export function traitTriggerSatisfactionMark(
  satisfied: boolean | null,
): "✓" | "✗" | null {
  if (satisfied === null) return null;
  return satisfied ? "✓" : "✗";
}

/** CSS-friendly state token for panel styling. */
export function traitTriggerSatisfactionState(
  satisfied: boolean | null,
): "satisfied" | "unsatisfied" | "descriptive" {
  if (satisfied === null) return "descriptive";
  return satisfied ? "satisfied" : "unsatisfied";
}

/**
 * Build panel rows for every seated personal / starship trait.
 * Empty when no traits are seated. Updates when callers recompute on seat changes.
 */
export function buildTraitTriggersPanel(
  input: BuildTraitTriggersPanelInput,
): TraitTriggerPanelRow[] {
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

  const rows: TraitTriggerPanelRow[] = [];

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

    rows.push({
      traitId: item.id,
      traitName: item.name,
      catalogKind: kind,
      image: item.image,
      slotId: slotFill.slotId,
      triggers,
    });
  }

  return rows;
}
