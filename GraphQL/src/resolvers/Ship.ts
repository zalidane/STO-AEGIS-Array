import type { PrismaClient } from "@sto-aegis/database";

export function createShipResolver(prisma: PrismaClient) {
  return {
    Query: {
      ships: () => prisma.ship.findMany({ orderBy: { name: "asc" } }),
      ship: (_parent: unknown, args: { id: number }) =>
        prisma.ship.findUnique({ where: { id: args.id } }),
      shipByName: (_parent: unknown, args: { name: string }) =>
        prisma.ship.findUnique({ where: { name: args.name } }),
    },
    Ship: {
      shipType: (parent: { shipTypeId: number | null }) =>
        parent.shipTypeId == null
          ? null
          : prisma.shipType.findUnique({ where: { id: parent.shipTypeId } }),
      uniConsole: (parent: { uniconsoleId: number | null }) =>
        parent.uniconsoleId == null
          ? null
          : prisma.infobox.findUnique({ where: { id: parent.uniconsoleId } }),
      starshipTraits: async (parent: { id: number }) => {
        const links = await prisma.starshipTraitShip.findMany({
          where: { shipId: parent.id },
          include: { starshipTrait: true },
        });
        return links.map((link) => link.starshipTrait);
      },
    },
  };
}
