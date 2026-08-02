import type { PrismaClient } from "@sto-aegis/database";

export function createMasteryResolver(prisma: PrismaClient) {
  return {
    Query: {
      masteries: () => prisma.mastery.findMany(),
      mastery: (_parent: unknown, args: { id: number }) =>
        prisma.mastery.findUnique({ where: { id: args.id } }),
    },
    Mastery: {
      primaryTrait: (parent: { traitId: number | null }) =>
        parent.traitId == null
          ? null
          : prisma.starshipTrait.findUnique({ where: { id: parent.traitId } }),
      secondaryTrait: (parent: { trait2Id: number | null }) =>
        parent.trait2Id == null
          ? null
          : prisma.starshipTrait.findUnique({ where: { id: parent.trait2Id } }),
      tertiaryTrait: (parent: { trait3Id: number | null }) =>
        parent.trait3Id == null
          ? null
          : prisma.starshipTrait.findUnique({ where: { id: parent.trait3Id } }),
      accountTrait: (parent: { acctraitId: number | null }) =>
        parent.acctraitId == null
          ? null
          : prisma.starshipTrait.findUnique({
              where: { id: parent.acctraitId },
            }),
      shipType: (parent: { shipTypeId: number | null }) =>
        parent.shipTypeId == null
          ? null
          : prisma.shipType.findUnique({ where: { id: parent.shipTypeId } }),
    },
  };
}
