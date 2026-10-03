import {
  mapGwObtain,
  mapInfobox,
  mapMastery,
  mapModifier,
  mapReputation,
  mapSetBonus,
  mapShip,
  mapStarshipTrait,
  mapSwObtain,
  mapTrait,
  mapTraySkill,
} from "../mappers/cargoMappers.js";
import {
  mergeModifiers,
  type ModifierCargoRow,
  type ModifierSupplementRow,
} from "./mergeModifiers.js";
import {
  mergeReputation,
  type ReputationCargoRow,
  type ReputationSupplementRow,
} from "./mergeReputation.js";
import {
  mergeSetBonus,
  type SetBonusCargoRow,
  type SetBonusSupplementRow,
} from "./mergeSetBonus.js";
import {
  mergeTraits,
  type TraitCargoRow,
  type TraitSupplementRow,
} from "./mergeTraits.js";
import { expandStarshipTraitRanks } from "./expandStarshipTraitRanks.js";

function mergeModifiersSupplement(
  cargo: Record<string, unknown>[],
  supplement: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(supplement)) {
    throw new Error("Modifiers supplement must be a JSON array");
  }
  return mergeModifiers(
    cargo as ModifierCargoRow[],
    supplement as ModifierSupplementRow[],
  ) as Record<string, unknown>[];
}

function mergeReputationSupplement(
  cargo: Record<string, unknown>[],
  supplement: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(supplement)) {
    throw new Error("Reputation supplement must be a JSON array");
  }
  return mergeReputation(
    cargo as ReputationCargoRow[],
    supplement as ReputationSupplementRow[],
  ) as Record<string, unknown>[];
}

function mergeSetBonusSupplement(
  cargo: Record<string, unknown>[],
  supplement: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(supplement)) {
    throw new Error("SetBonus supplement must be a JSON array");
  }
  return mergeSetBonus(
    cargo as SetBonusCargoRow[],
    supplement as SetBonusSupplementRow[],
  ) as Record<string, unknown>[];
}

function mergeTraitsSupplement(
  cargo: Record<string, unknown>[],
  supplement: unknown,
): Record<string, unknown>[] {
  if (!Array.isArray(supplement)) {
    throw new Error("Traits supplement must be a JSON array");
  }
  return mergeTraits(
    cargo as TraitCargoRow[],
    supplement as TraitSupplementRow[],
  ) as Record<string, unknown>[];
}

export const importMappings = {
  GwObtain: {
    model: "gwObtain",
    uniqueFields: ["cat", "type", "flavor"],
    mapper: mapGwObtain,
  },
  Infobox: {
    model: "infobox",
    strategy: "replace",
    identityFields: ["name", "type"],
    mapper: mapInfobox,
  },
  Mastery: {
    model: "mastery",
    strategy: "replace",
    mapper: mapMastery,
  },
  Modifiers: {
    model: "modifier",
    // Replace so widened `type` keys replace the prior unique pair instead of
    // leaving an orphan Cargo row beside the supplemented one.
    strategy: "replace" as const,
    identityFields: ["modifier", "type"] as const,
    mapper: mapModifier,
    // Corrections live in CatalogSupplement (kind Modifiers), not a committed file.
    supplementKind: "Modifiers",
    mergeSupplement: mergeModifiersSupplement,
  },
  Reputation: {
    model: "reputation",
    uniqueFields: ["name"],
    mapper: mapReputation,
    supplementKind: "Reputation",
    mergeSupplement: mergeReputationSupplement,
  },
  SetBonus: {
    model: "setBonus",
    uniqueFields: ["name"],
    mapper: mapSetBonus,
    supplementKind: "SetBonus",
    mergeSupplement: mergeSetBonusSupplement,
  },
  Ships: {
    model: "ship",
    uniqueFields: ["name"],
    mapper: mapShip,
  },
  StarshipTraits: {
    model: "starshipTrait",
    uniqueFields: ["name"],
    mapper: mapStarshipTrait,
    prepareRows: expandStarshipTraitRanks,
  },
  SwObtain: {
    model: "swObtain",
    uniqueFields: ["cat", "type", "flavor"],
    mapper: mapSwObtain,
  },
  Traits: {
    model: "trait",
    uniqueFields: ["name", "type", "environment"],
    mapper: mapTrait,
    supplementKind: "Traits",
    mergeSupplement: mergeTraitsSupplement,
  },
  TraySkill: {
    model: "traySkill",
    uniqueFields: ["name"],
    mapper: mapTraySkill,
  },
} as const;
