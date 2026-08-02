import type { PrismaClient } from "@sto-aegis/database";

export function createTraySkillResolver(prisma: PrismaClient) {
  return {
    Query: {
      traySkills: () =>
        prisma.traySkill.findMany({ orderBy: { name: "asc" } }),
      traySkill: (_parent: unknown, args: { id: number }) =>
        prisma.traySkill.findUnique({ where: { id: args.id } }),
      traySkillByName: (_parent: unknown, args: { name: string }) =>
        prisma.traySkill.findUnique({ where: { name: args.name } }),
    },
  };
}
