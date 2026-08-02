import type { PrismaClient } from "@sto-aegis/database";
import { scalarResolvers } from "./scalars.js";
import { createSearchResolver } from "./Search.js";
import { createShipResolver } from "./Ship.js";
import { createStarshipTraitResolver } from "./StarshipTrait.js";
import { createTraitResolver } from "./Trait.js";
import { createInfoboxResolver } from "./Infobox.js";
import { createMasteryResolver } from "./Mastery.js";
import { createModifierResolver } from "./Modifier.js";
import { createReputationResolver } from "./Reputation.js";
import { createSetBonusResolver } from "./SetBonus.js";
import { createTraySkillResolver } from "./TraySkill.js";
import { createGwObtainResolver } from "./GwObtain.js";
import { createSwObtainResolver } from "./SwObtain.js";
import { createShipTypeResolver } from "./ShipType.js";

type ResolverMap = Record<string, Record<string, unknown>>;

function mergeResolvers(...parts: ResolverMap[]): ResolverMap {
  const merged: ResolverMap = {};
  for (const part of parts) {
    for (const [typeName, fields] of Object.entries(part)) {
      merged[typeName] = { ...merged[typeName], ...fields };
    }
  }
  return merged;
}

export function createResolvers(prisma: PrismaClient) {
  return {
    ...scalarResolvers,
    ...mergeResolvers(
      {
        Query: {
          _health: () => "ok",
        },
      },
      createSearchResolver(prisma),
      createShipResolver(prisma),
      createStarshipTraitResolver(prisma),
      createTraitResolver(prisma),
      createInfoboxResolver(prisma),
      createMasteryResolver(prisma),
      createModifierResolver(prisma),
      createReputationResolver(prisma),
      createSetBonusResolver(prisma),
      createTraySkillResolver(prisma),
      createGwObtainResolver(prisma),
      createSwObtainResolver(prisma),
      createShipTypeResolver(prisma),
    ),
  };
}

export {
  createSearchResolver,
  createShipResolver,
  createStarshipTraitResolver,
  createTraitResolver,
  createInfoboxResolver,
  createMasteryResolver,
  createModifierResolver,
  createReputationResolver,
  createSetBonusResolver,
  createTraySkillResolver,
  createGwObtainResolver,
  createSwObtainResolver,
  createShipTypeResolver,
};
