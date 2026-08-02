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

export const importMappings = {
  GwObtain: {
    model: "gwObtain",
    uniqueFields: ["cat", "type", "flavor"],
    mapper: mapGwObtain,
  },
  Infobox: {
    model: "infobox",
    strategy: "replace",
    mapper: mapInfobox,
  },
  Mastery: {
    model: "mastery",
    strategy: "replace",
    mapper: mapMastery,
  },
  Modifiers: {
    model: "modifier",
    uniqueFields: ["modifier", "type"],
    mapper: mapModifier,
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
