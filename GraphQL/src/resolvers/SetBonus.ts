import type { PrismaClient } from "@sto-aegis/database";

export function createSetBonusResolver(prisma: PrismaClient) {
  return {
    Query: {
      setBonuses: () => prisma.setBonus.findMany({ orderBy: { name: "asc" } }),
      setBonus: (_parent: unknown, args: { id: number }) =>
        prisma.setBonus.findUnique({ where: { id: args.id } }),
      setBonusByName: (_parent: unknown, args: { name: string }) =>
        prisma.setBonus.findUnique({ where: { name: args.name } }),
    },
  };
}
