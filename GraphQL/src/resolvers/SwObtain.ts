import type { PrismaClient } from "@sto-aegis/database";

export function createSwObtainResolver(prisma: PrismaClient) {
  return {
    Query: {
      swObtains: () => prisma.swObtain.findMany(),
      swObtain: (_parent: unknown, args: { id: number }) =>
        prisma.swObtain.findUnique({ where: { id: args.id } }),
      swObtainByKey: (
        _parent: unknown,
        args: { cat: string; type: string; flavor: string },
      ) =>
        prisma.swObtain.findUnique({
          where: {
            cat_type_flavor: {
              cat: args.cat,
              type: args.type,
              flavor: args.flavor,
            },
          },
        }),
    },
    SwObtain: {
      lockBox: (parent: { lockBoxId: number | null }) =>
        parent.lockBoxId == null
          ? null
          : prisma.infobox.findUnique({ where: { id: parent.lockBoxId } }),
    },
  };
}
