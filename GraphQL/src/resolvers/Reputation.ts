import type { PrismaClient } from "@sto-aegis/database";

export function createReputationResolver(prisma: PrismaClient) {
  return {
    Query: {
      reputations: () =>
        prisma.reputation.findMany({ orderBy: { name: "asc" } }),
      reputation: (_parent: unknown, args: { id: number }) =>
        prisma.reputation.findUnique({ where: { id: args.id } }),
      reputationByName: (_parent: unknown, args: { name: string }) =>
        prisma.reputation.findUnique({ where: { name: args.name } }),
    },
  };
}
