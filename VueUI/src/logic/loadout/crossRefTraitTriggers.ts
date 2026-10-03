import {
  type ExtractedTraitTrigger,
  type TraitTriggerKind,
  type TraitTriggerProfession,
  type TraitTriggerWeaponClass,
  findProfessionKeywords,
} from "@/logic/loadout/extractTraitTriggers";
import {
  BOFF_CATALOG_KIND,
  type BoffPowerSource,
} from "@/logic/loadout/boffPowers";
import { fillCatalogKind } from "@/logic/loadout/setBonus";
import {
  itemSlotClassesFromType,
  type HullSlotKind,
} from "@/logic/loadout/slotClass";
import {
  abilitiesForFunctionalCategory,
  isAbilityInFamily,
  normalizeTriggerAbilityName,
  resolveTriggerAbilityAlias,
  type TriggerAbilityFamily,
  type TriggerFunctionalCategory,
} from "@/logic/loadout/triggerAliases";
import {
  damageTypesFromWeapon,
  weaponClassesFromWeapon,
} from "@/logic/loadout/weaponProfile";
import type {
  LoadoutCatalogKind,
  LoadoutItem,
  LoadoutSlotFill,
} from "@/logic/loadout/types";

/**
 * Cross-reference extracted trait triggers against the seated loadout (#32).
 *
 * Pure logic for trait-icon status marks. No Vue/store/GraphQL deps.
 */

/** Catalog kinds (plus captain powers) that can satisfy a trigger. */
export type TraitTriggerMatchKind = LoadoutCatalogKind | "captainAbility";

/** One seated fill that matched a trigger. */
export type TraitTriggerMatchedItem = {
  itemId: number;
  name: string;
  catalogKind: TraitTriggerMatchKind;
  slotId?: string;
  /** Tray-skill profession/spec (`type`) when applicable. */
  type?: string | null;
  /**
   * Hover phrase when the catalog name does not already say how it matched
   * (damage type on a weapon whose name omits that type).
   */
  statusLabel?: string;
};

/**
 * Per-trigger satisfaction.
 * Combat-state / combat-action-only triggers are treated as satisfied
 * (no seating check). `satisfied` may still be `null` only for legacy callers.
 */
export type TraitTriggerSatisfaction = {
  label: string;
  kind: TraitTriggerKind;
  satisfied: boolean | null;
  matchedItems: TraitTriggerMatchedItem[];
  /** Original extracted trigger (profession lists, category keys, …). */
  trigger: ExtractedTraitTrigger;
};

/**
 * Normalized seated ability / hangar / captain / weapon fill used for matching.
 * Prefer {@link collectSeatedTriggerFills} when starting from loadout slots.
 */
export type SeatedTriggerFill = {
  itemId: number;
  name: string;
  catalogKind: TraitTriggerMatchKind;
  type?: string | null;
  slotId?: string;
  /** Hull / BOff / captain seat kind when known. */
  slotKind?: HullSlotKind | "boff" | "captain";
  /** Infobox body copy. Damage procs often live here rather than in the name. */
  searchText?: string | null;
};

export type CollectSeatedTriggerFillsInput = {
  slots: ReadonlyArray<LoadoutSlotFill>;
  catalog: ReadonlyArray<
    Pick<LoadoutItem, "id" | "name" | "type" | "catalogKind"> & {
      searchText?: string | null;
    }
  >;
  /** Used to classify hangar fills by slot kind. */
  hullSlots?: ReadonlyArray<{ id: string; kind: HullSlotKind }>;
  /**
   * Captain career / racial powers (not stored as `traySkill` fills today).
   * Matched by name for `namedAbility` and `captainAbility` categories.
   */
  captainPowers?: ReadonlyArray<{
    id: number;
    name: string;
    type?: string | null;
  }>;
};

function catalogKey(
  kind: LoadoutCatalogKind,
  id: number,
): string {
  return `${kind}:${id}`;
}

function abilityKey(name: string): string {
  const resolved = resolveTriggerAbilityAlias(name) ?? name;
  return normalizeTriggerAbilityName(resolved);
}

function abilitiesMatch(a: string, b: string): boolean {
  const ka = abilityKey(a);
  const kb = abilityKey(b);
  return ka.length > 0 && ka === kb;
}

/**
 * Map a tray-skill `type` (or free text) onto the #31 profession vocabulary.
 * Returns null when the type is blank or unrecognized.
 */
export function resolveSeatedProfession(
  type: string | null | undefined,
): TraitTriggerProfession | null {
  if (!type?.trim()) return null;
  return findProfessionKeywords(type)[0] ?? null;
}

function isHangarFill(fill: SeatedTriggerFill): boolean {
  if (fill.slotKind === "hangar") return true;
  if (fill.catalogKind !== "item") return false;
  return itemSlotClassesFromType(fill.type).includes("hangar");
}

function isTraySkillFill(fill: SeatedTriggerFill): boolean {
  return fill.catalogKind === BOFF_CATALOG_KIND;
}

function isCaptainPowerFill(fill: SeatedTriggerFill): boolean {
  return fill.catalogKind === "captainAbility" || fill.slotKind === "captain";
}

const WEAPON_SLOT_KINDS = new Set<string>([
  "foreWeapon",
  "aftWeapon",
  "experimental",
]);

function isWeaponFill(fill: SeatedTriggerFill): boolean {
  if (fill.slotKind && WEAPON_SLOT_KINDS.has(fill.slotKind)) return true;
  if (fill.catalogKind !== "item") return false;
  return itemSlotClassesFromType(fill.type).some((kind) =>
    WEAPON_SLOT_KINDS.has(kind),
  );
}

/**
 * Classify a seated weapon by catalog name and body copy.
 * Beams: Beam Array, Dual Beam Bank, Omni-Directional … Beam …
 * Cannons: Dual Cannons, Dual Heavy Cannons, Turret, … Cannon …
 * Energy: beams, cannons, and other directed-energy names.
 * Torpedo: a torpedo launcher. Plasma Torpedo stays a torpedo.
 */
export function weaponClassesFromItemName(
  name: string | null | undefined,
): TraitTriggerWeaponClass[] {
  return weaponClassesFromWeapon({ name });
}

function toMatchedItem(fill: SeatedTriggerFill): TraitTriggerMatchedItem {
  return {
    itemId: fill.itemId,
    name: fill.name,
    catalogKind: fill.catalogKind,
    ...(fill.slotId != null ? { slotId: fill.slotId } : {}),
    ...(fill.type !== undefined ? { type: fill.type } : {}),
  };
}

function uniqueMatched(
  fills: ReadonlyArray<SeatedTriggerFill>,
): TraitTriggerMatchedItem[] {
  const seen = new Set<string>();
  const out: TraitTriggerMatchedItem[] = [];
  for (const fill of fills) {
    const key = `${fill.catalogKind}:${fill.itemId}:${fill.slotId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toMatchedItem(fill));
  }
  return out;
}

/**
 * Gather seated BOff powers, hangar pets, weapons, and optional captain powers
 * into a flat list for {@link crossRefTraitTriggers}.
 */
export function collectSeatedTriggerFills(
  input: CollectSeatedTriggerFillsInput,
): SeatedTriggerFill[] {
  const byKey = new Map(
    input.catalog.map((item) => [
      catalogKey(item.catalogKind ?? "item", item.id),
      item,
    ]),
  );
  const hullKindBySlot = new Map(
    (input.hullSlots ?? []).map((slot) => [slot.id, slot.kind]),
  );

  const fills: SeatedTriggerFill[] = [];

  for (const slotFill of input.slots) {
    const kind = fillCatalogKind(slotFill);
    const item = byKey.get(catalogKey(kind, slotFill.itemId));
    if (!item) continue;

    const hullKind = hullKindBySlot.get(slotFill.slotId);
    const isBoff =
      kind === BOFF_CATALOG_KIND || /^boff-\d+-/.test(slotFill.slotId);

    fills.push({
      itemId: item.id,
      name: item.name,
      catalogKind: kind,
      type: item.type,
      slotId: slotFill.slotId,
      slotKind: isBoff ? "boff" : hullKind,
      searchText: item.searchText,
    });
  }

  for (const power of input.captainPowers ?? []) {
    fills.push({
      itemId: power.id,
      name: power.name,
      catalogKind: "captainAbility",
      type: power.type ?? null,
      slotKind: "captain",
    });
  }

  return fills;
}

function matchNamedAbility(
  abilityName: string,
  seated: ReadonlyArray<SeatedTriggerFill>,
): SeatedTriggerFill[] {
  return seated.filter((fill) => {
    if (!isTraySkillFill(fill) && !isCaptainPowerFill(fill)) return false;
    return abilitiesMatch(fill.name, abilityName);
  });
}

function matchProfessionCategory(
  professions: readonly TraitTriggerProfession[],
  seated: ReadonlyArray<SeatedTriggerFill>,
): SeatedTriggerFill[] {
  if (professions.length === 0) return [];
  const wanted = new Set(professions);
  return seated.filter((fill) => {
    if (!isTraySkillFill(fill)) return false;
    const profession = resolveSeatedProfession(fill.type);
    return profession != null && wanted.has(profession);
  });
}

function matchFunctionalCategory(
  category: TriggerFunctionalCategory,
  seated: ReadonlyArray<SeatedTriggerFill>,
): SeatedTriggerFill[] {
  if (category === "hangarPets") {
    return seated.filter(isHangarFill);
  }

  // Any seated Bridge Officer tray skill (The Boimler Effect, etc.).
  if (category === "bridgeOfficerAbility") {
    return seated.filter(isTraySkillFill);
  }

  const catalogNames = abilitiesForFunctionalCategory(category);
  const nameSet = new Set(catalogNames.map((name) => abilityKey(name)));

  if (category === "captainAbility") {
    return seated.filter((fill) => {
      if (isCaptainPowerFill(fill)) {
        // Explicit captain fills always count for the captainAbility category.
        if (nameSet.size === 0) return true;
        return nameSet.has(abilityKey(fill.name));
      }
      if (!isTraySkillFill(fill)) return false;
      return nameSet.has(abilityKey(fill.name));
    });
  }

  // anomaly / control / exotic — tray-skill names ∩ curated lists
  return seated.filter((fill) => {
    if (!isTraySkillFill(fill) && !isCaptainPowerFill(fill)) return false;
    return nameSet.has(abilityKey(fill.name));
  });
}

function matchAbilityFamily(
  family: TriggerAbilityFamily,
  seated: ReadonlyArray<SeatedTriggerFill>,
): SeatedTriggerFill[] {
  return seated.filter(
    (fill) => isTraySkillFill(fill) && isAbilityInFamily(fill.name, family),
  );
}

function matchWeaponClass(
  classes: readonly TraitTriggerWeaponClass[],
  seated: ReadonlyArray<SeatedTriggerFill>,
): SeatedTriggerFill[] {
  if (classes.length === 0) return [];
  const wanted = new Set(classes);
  return seated.filter((fill) => {
    if (!isWeaponFill(fill)) return false;
    return weaponClassesFromWeapon(fill).some((cls) => wanted.has(cls));
  });
}

function matchingDamageLabel(
  fill: SeatedTriggerFill,
  types: readonly string[],
): string | null {
  const wanted = new Set(types.map((type) => type.toLowerCase()));
  const found = damageTypesFromWeapon(fill).filter((type) =>
    wanted.has(type.toLowerCase()),
  );
  if (found.length === 0) return null;
  const named = found.find((type) =>
    fill.name.toLowerCase().includes(type.toLowerCase()),
  );
  const type = named ?? found[0];
  if (!type) return fill.name;
  if (fill.name.toLowerCase().includes(type.toLowerCase())) return fill.name;
  return `${type} (${fill.name})`;
}

function matchDamageType(
  types: readonly string[],
  seated: ReadonlyArray<SeatedTriggerFill>,
): Array<{ fill: SeatedTriggerFill; label: string }> {
  if (types.length === 0) return [];
  const matches: Array<{ fill: SeatedTriggerFill; label: string }> = [];
  for (const fill of seated) {
    if (!isWeaponFill(fill)) continue;
    const label = matchingDamageLabel(fill, types);
    if (!label) continue;
    matches.push({ fill, label });
  }
  return matches;
}

function satisfyOne(
  trigger: ExtractedTraitTrigger,
  seated: ReadonlyArray<SeatedTriggerFill>,
): TraitTriggerSatisfaction {
  // Combat-state / combat-action-only: no seating check → satisfied.
  if (trigger.kind === "combatState") {
    return {
      label: trigger.display,
      kind: trigger.kind,
      satisfied: true,
      matchedItems: [],
      trigger,
    };
  }

  if (trigger.kind === "damageType") {
    const damageMatches = matchDamageType(trigger.damageTypes, seated);
    const matchedItems = uniqueMatched(damageMatches.map((row) => row.fill)).map(
      (item) => {
        const label = damageMatches.find(
          (row) =>
            row.fill.itemId === item.itemId &&
            row.fill.slotId === item.slotId,
        )?.label;
        return label ? { ...item, statusLabel: label } : item;
      },
    );
    return {
      label: trigger.display,
      kind: trigger.kind,
      satisfied: matchedItems.length > 0,
      matchedItems,
      trigger,
    };
  }

  let matches: SeatedTriggerFill[] = [];
  if (trigger.kind === "namedAbility") {
    matches = matchNamedAbility(trigger.abilityName, seated);
  } else if (trigger.kind === "professionCategory") {
    matches = matchProfessionCategory(trigger.professions, seated);
  } else if (trigger.kind === "functionalCategory") {
    matches = matchFunctionalCategory(trigger.category, seated);
  } else if (trigger.kind === "abilityFamily") {
    matches = matchAbilityFamily(trigger.family, seated);
  } else if (trigger.kind === "weaponClass") {
    matches = matchWeaponClass(trigger.classes, seated);
  }

  const matchedItems = uniqueMatched(matches);
  return {
    label: trigger.display,
    kind: trigger.kind,
    satisfied: matchedItems.length > 0,
    matchedItems,
    trigger,
  };
}

/**
 * Compute per-trigger slotted status against seated fills.
 * Preserves extraction order (suitable for icon hover summaries).
 */
export function crossRefTraitTriggers(
  triggers: ReadonlyArray<ExtractedTraitTrigger>,
  seated: ReadonlyArray<SeatedTriggerFill>,
): TraitTriggerSatisfaction[] {
  return triggers.map((trigger) => satisfyOne(trigger, seated));
}

/**
 * Convenience: resolve loadout slots + catalog into fills, then cross-ref.
 */
export function crossRefTraitTriggersAgainstLoadout(
  triggers: ReadonlyArray<ExtractedTraitTrigger>,
  input: CollectSeatedTriggerFillsInput,
): TraitTriggerSatisfaction[] {
  return crossRefTraitTriggers(triggers, collectSeatedTriggerFills(input));
}

/**
 * Sort: unsatisfied checkable → satisfied (incl. combat-state).
 * Stable within each group (preserves relative extraction order).
 */
export function orderTraitTriggersForPanel(
  rows: ReadonlyArray<TraitTriggerSatisfaction>,
): TraitTriggerSatisfaction[] {
  const rank = (row: TraitTriggerSatisfaction): number => {
    if (row.satisfied === false) return 0;
    if (row.satisfied === true) return 1;
    return 2;
  };
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const byRank = rank(a.row) - rank(b.row);
      return byRank !== 0 ? byRank : a.index - b.index;
    })
    .map(({ row }) => row);
}

/** Thin adapter: BOff power rows as seated trigger fills (tests / callers). */
export function seatedFillsFromBoffPowers(
  powers: ReadonlyArray<BoffPowerSource>,
  slotIdPrefix = "boff-0-",
): SeatedTriggerFill[] {
  return powers.map((power, index) => ({
    itemId: power.id,
    name: power.name,
    catalogKind: BOFF_CATALOG_KIND,
    type: power.type,
    slotId: `${slotIdPrefix}${index}`,
    slotKind: "boff" as const,
  }));
}
