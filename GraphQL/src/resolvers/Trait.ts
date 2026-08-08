import type { PrismaClient } from "@sto-aegis/database";

type TraitRow = {
  Id: number;
  name: string;
  type: string | null;
  environment: string | null;
};

export function createTraitResolver(prisma: PrismaClient) {
  return {
    Query: {
      traits: () => prisma.trait.findMany({ orderBy: { name: "asc" } }),
      trait: (
        _parent: unknown,
        args: { name: string; type: string; environment: string },
      ) =>
        prisma.trait.findUnique({
          where: {
            name_type_environment: {
              name: args.name,
              type: args.type,
              environment: args.environment,
            },
          },
        }),
      traitById: (_parent: unknown, args: { id: number }) =>
        prisma.trait.findUnique({ where: { Id: args.id } }),
    },
    Trait: {
      id: (parent: TraitRow) => parent.Id,
    },
  };
}
