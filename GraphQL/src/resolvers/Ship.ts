import type { PrismaClient } from "@sto-aegis/database";
import { formatShipResolvedName } from "../logic/formatShipResolvedName.js";

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
      name: (parent: { name: string; displayClass: string | null }) =>
        formatShipResolvedName(parent.name, parent.displayClass),
      shipType: (parent: { shipTypeId: number | null }) =>
        parent.shipTypeId == null
          ? null
          : prisma.shipType.findUnique({ where: { id: parent.shipTypeId } }),
      uniConsole: (parent: { uniconsoleId: number | null }) =>
        parent.uniconsoleId == null
          ? null
          : prisma.infobox.findUnique({ where: { id: parent.uniconsoleId } }),
      experimentalWeaponItem: (parent: { experimentalWeaponId: number | null }) =>
        parent.experimentalWeaponId == null
          ? null
          : prisma.infobox.findUnique({
              where: { id: parent.experimentalWeaponId },
            }),
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
