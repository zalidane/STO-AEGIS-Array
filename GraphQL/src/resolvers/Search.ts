import type { PrismaClient } from "@sto-aegis/database";

export function createSearchResolver(prisma: PrismaClient) {
  return {
    Query: {
      search: async (_parent: unknown, args: { text: string }) => {
        const [ships, starshipTraits, traits, traySkills, reputations, setBonuses] =
          await Promise.all([
            prisma.ship.findMany({
              where: { name: { contains: args.text, mode: "insensitive" } },
              take: 20,
            }),
            prisma.starshipTrait.findMany({
              where: { name: { contains: args.text, mode: "insensitive" } },
              take: 20,
            }),
            prisma.trait.findMany({
              where: { name: { contains: args.text, mode: "insensitive" } },
              take: 20,
            }),
            prisma.traySkill.findMany({
              where: { name: { contains: args.text, mode: "insensitive" } },
              take: 20,
            }),
            prisma.reputation.findMany({
              where: { name: { contains: args.text, mode: "insensitive" } },
              take: 20,
            }),
            prisma.setBonus.findMany({
              where: { name: { contains: args.text, mode: "insensitive" } },
              take: 20,
            }),
          ]);

        return [
          ...ships.map((s) => ({ type: "Ship", name: s.name })),
          ...starshipTraits.map((t) => ({
            type: "StarshipTrait",
            name: t.name,
          })),
          ...traits.map((t) => ({ type: "Trait", name: t.name })),
          ...traySkills.map((t) => ({ type: "TraySkill", name: t.name })),
          ...reputations.map((r) => ({ type: "Reputation", name: r.name })),
          ...setBonuses.map((s) => ({ type: "SetBonus", name: s.name })),
        ];
      },
    },
  };
}
