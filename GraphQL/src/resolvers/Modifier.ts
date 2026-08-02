import type { PrismaClient } from "@sto-aegis/database";

export function createModifierResolver(prisma: PrismaClient) {
  return {
    Query: {
      modifiers: () => prisma.modifier.findMany({ orderBy: { modifier: "asc" } }),
      modifier: (_parent: unknown, args: { id: number }) =>
        prisma.modifier.findUnique({ where: { id: args.id } }),
      modifierByKey: (
        _parent: unknown,
        args: { modifier: string; type: string },
      ) =>
        prisma.modifier.findUnique({
          where: {
            modifier_type: { modifier: args.modifier, type: args.type },
          },
        }),
    },
    Modifier: {
      items: async (parent: { id: number }) => {
        const links = await prisma.modifierItem.findMany({
          where: { modifierId: parent.id },
          include: { infobox: true },
        });
        return links.map((link) => link.infobox);
      },
    },
  };
}
