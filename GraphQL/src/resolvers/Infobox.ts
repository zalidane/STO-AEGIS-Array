import type { PrismaClient } from "@sto-aegis/database";
import { countPublicUsage } from "./Build.js";

export function createInfoboxResolver(prisma: PrismaClient) {
  return {
    Query: {
      infoboxes: () => prisma.infobox.findMany({ orderBy: { name: "asc" } }),
      infobox: (_parent: unknown, args: { id: number }) =>
        prisma.infobox.findUnique({ where: { id: args.id } }),
      infoboxesByName: (_parent: unknown, args: { name: string }) =>
        prisma.infobox.findMany({ where: { name: args.name } }),
    },
    Infobox: {
      gwLockBoxes: (parent: { id: number }) =>
        prisma.gwObtain.findMany({ where: { lockBoxId: parent.id } }),
      swLockBoxes: (parent: { id: number }) =>
        prisma.swObtain.findMany({ where: { lockBoxId: parent.id } }),
      shipsWithConsole: (parent: { id: number }) =>
        prisma.ship.findMany({ where: { uniconsoleId: parent.id } }),
      shipsWithExperimentalWeapon: (parent: { id: number }) =>
        prisma.ship.findMany({
          where: { experimentalWeaponId: parent.id },
        }),
      publicBuildCount: (parent: { name: string; type: string | null }) =>
        countPublicUsage(prisma, {
          catalogKind: "item",
          name: parent.name,
          type: parent.type,
        }),
    },
  };
}
