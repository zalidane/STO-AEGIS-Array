import { createPrismaClient } from "@sto-aegis/database";
import ships from "../../output/Ships.json";

const { prisma } = createPrismaClient();

async function main() {
  for (const ship of ships) {
    await prisma.ship.upsert({
      where: { name: ship.name },
      update: {
        rawData: ship,
      },
      create: {
        name: ship.name,
        tier: ship.tier ? parseInt(ship.tier) : null,
        type: ship.type,
        rawData: ship,
      },
    });
  }

  console.log(`Imported ${ships.length} ships`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
