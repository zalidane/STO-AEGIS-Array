import type { PrismaClient } from "@sto-aegis/database";
import { countPublicUsage } from "./Build.js";

export function createStarshipTraitResolver(prisma: PrismaClient) {
  return {
    Query: {
      starshipTraits: () =>
        prisma.starshipTrait.findMany({ orderBy: { name: "asc" } }),
      starshipTrait: (_parent: unknown, args: { id: number }) =>
        prisma.starshipTrait.findUnique({ where: { id: args.id } }),
      starshipTraitByName: (_parent: unknown, args: { name: string }) =>
        prisma.starshipTrait.findUnique({ where: { name: args.name } }),
    },
    StarshipTrait: {
      ships: async (parent: { id: number }) => {
        const links = await prisma.starshipTraitShip.findMany({
          where: { starshipTraitId: parent.id },
          include: { ship: true },
        });
        return links.map((link) => link.ship);
      },
      publicBuildCount: (parent: { name: string }) =>
        countPublicUsage(prisma, {
          catalogKind: "starshipTrait",
          name: parent.name,
        }),
    },
  };
}
