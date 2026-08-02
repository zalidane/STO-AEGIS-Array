import type { PrismaClient } from "@sto-aegis/database";

export function createGwObtainResolver(prisma: PrismaClient) {
  return {
    Query: {
      gwObtains: () => prisma.gwObtain.findMany(),
      gwObtain: (_parent: unknown, args: { id: number }) =>
        prisma.gwObtain.findUnique({ where: { id: args.id } }),
      gwObtainByKey: (
        _parent: unknown,
        args: { cat: string; type: string; flavor: string },
      ) =>
        prisma.gwObtain.findUnique({
          where: {
            cat_type_flavor: {
              cat: args.cat,
              type: args.type,
              flavor: args.flavor,
            },
          },
        }),
    },
    GwObtain: {
      lockBox: (parent: { lockBoxId: number | null }) =>
        parent.lockBoxId == null
          ? null
          : prisma.infobox.findUnique({ where: { id: parent.lockBoxId } }),
    },
  };
}
