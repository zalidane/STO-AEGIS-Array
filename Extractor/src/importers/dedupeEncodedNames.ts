import type { PrismaClient } from "@sto-aegis/database";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";

type NamedRow = { id: number; name: string };

function groupByDecodedName(rows: NamedRow[]): Map<string, NamedRow[]> {
  const groups = new Map<string, NamedRow[]>();
  for (const row of rows) {
    const key = decodeHtmlEntities(row.name);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

function pickCanonical(decodedName: string, group: NamedRow[]): NamedRow {
  const sorted = [...group].sort((a, b) => {
    const aDecoded = a.name === decodedName ? 0 : 1;
    const bDecoded = b.name === decodedName ? 0 : 1;
    if (aDecoded !== bDecoded) return aDecoded - bDecoded;
    return a.id - b.id;
  });
  return sorted[0]!;
}

/**
 * Merge ships that only differ by HTML encoding in `name`
 * (e.g. `Mat&#039;Ha Raptor` vs `Mat'Ha Raptor`).
 */
export async function dedupeShipsByDecodedName(prisma: PrismaClient) {
  const ships = await prisma.ship.findMany({
    select: { id: true, name: true },
  });
  const groups = groupByDecodedName(ships);
  let merged = 0;
  let renamed = 0;

  for (const [decodedName, group] of groups) {
    const keep = pickCanonical(decodedName, group);
    const dupes = group.filter((row) => row.id !== keep.id);

    for (const dupe of dupes) {
      const links = await prisma.starshipTraitShip.findMany({
        where: { shipId: dupe.id },
      });
      if (links.length) {
        await prisma.starshipTraitShip.createMany({
          data: links.map((link) => ({
            starshipTraitId: link.starshipTraitId,
            shipId: keep.id,
          })),
          skipDuplicates: true,
        });
      }
      await prisma.ship.delete({ where: { id: dupe.id } });
      merged += 1;
    }

    if (keep.name !== decodedName) {
      await prisma.ship.update({
        where: { id: keep.id },
        data: { name: decodedName },
      });
      renamed += 1;
    }
  }

  return { merged, renamed };
}

/**
 * Merge starship traits that only differ by HTML encoding in `name`.
 */
export async function dedupeStarshipTraitsByDecodedName(prisma: PrismaClient) {
  const traits = await prisma.starshipTrait.findMany({
    select: { id: true, name: true },
  });
  const groups = groupByDecodedName(traits);
  let merged = 0;
  let renamed = 0;

  for (const [decodedName, group] of groups) {
    const keep = pickCanonical(decodedName, group);
    const dupes = group.filter((row) => row.id !== keep.id);

    for (const dupe of dupes) {
      const links = await prisma.starshipTraitShip.findMany({
        where: { starshipTraitId: dupe.id },
      });
      if (links.length) {
        await prisma.starshipTraitShip.createMany({
          data: links.map((link) => ({
            starshipTraitId: keep.id,
            shipId: link.shipId,
          })),
          skipDuplicates: true,
        });
      }

      await prisma.mastery.updateMany({
        where: { traitId: dupe.id },
        data: { traitId: keep.id },
      });
      await prisma.mastery.updateMany({
        where: { trait2Id: dupe.id },
        data: { trait2Id: keep.id },
      });
      await prisma.mastery.updateMany({
        where: { trait3Id: dupe.id },
        data: { trait3Id: keep.id },
      });
      await prisma.mastery.updateMany({
        where: { acctraitId: dupe.id },
        data: { acctraitId: keep.id },
      });

      await prisma.starshipTrait.delete({ where: { id: dupe.id } });
      merged += 1;
    }

    if (keep.name !== decodedName) {
      await prisma.starshipTrait.update({
        where: { id: keep.id },
        data: { name: decodedName },
      });
      renamed += 1;
    }
  }

  return { merged, renamed };
}
