import { mapShip, mapStarshipTrait, mapTrait } from "../mappers/cargoMappers";

export const importMappings = {
  //   GwObtain: "gwObtain",
  //   Infobox: "items",
  //   Mastery: "mastery",
  //   Modifiers: "modifiers",
  //   Reputation: "reputation",
  //   SetBonus: "setBonus",
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
  //   SwObtain: "swObtain",
  Traits: {
    model: "trait",
    uniqueFields: ["name", "type", "environment"],
    mapper: mapTrait,
  },
  //   TraySkill: "traySkill",
} as const;
