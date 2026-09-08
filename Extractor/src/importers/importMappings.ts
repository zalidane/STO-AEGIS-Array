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

export const MODIFIERS_SUPPLEMENT_PATH = "output/supplements/Modifiers.json";

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
    supplementFile: MODIFIERS_SUPPLEMENT_PATH,
    mergeSupplement: mergeModifiersSupplement,
  },
  Reputation: {
    model: "reputation",
    uniqueFields: ["name"],
    mapper: mapReputation,
  },
  SetBonus: {
    model: "setBonus",
    uniqueFields: ["name"],
    mapper: mapSetBonus,
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
  },
  TraySkill: {
    model: "traySkill",
    uniqueFields: ["name"],
    mapper: mapTraySkill,
  },
} as const;
