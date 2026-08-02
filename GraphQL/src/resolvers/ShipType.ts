import type { PrismaClient } from "@sto-aegis/database";

export function createShipTypeResolver(prisma: PrismaClient) {
  return {
    Query: {
      shipTypes: () => prisma.shipType.findMany({ orderBy: { name: "asc" } }),
      shipType: (_parent: unknown, args: { id: number }) =>
        prisma.shipType.findUnique({ where: { id: args.id } }),
      shipTypeByName: (_parent: unknown, args: { name: string }) =>
        prisma.shipType.findUnique({ where: { name: args.name } }),
    },
    ShipType: {
      ships: (parent: { id: number }) =>
        prisma.ship.findMany({ where: { shipTypeId: parent.id } }),
      masteries: (parent: { id: number }) =>
        prisma.mastery.findMany({ where: { shipTypeId: parent.id } }),
    },
  };
}
