import type { PrismaClient } from "../generated/prisma/client";
import {
  extractWikiTargets,
  splitList,
  normalizeShipType,
} from "../utils/parseRefs";

function nameIdMap(rows: { id: number; name: string }[]): Map<string, number> {
  return new Map(rows.map((row) => [row.name, row.id]));
}

export async function linkRelations(prisma: PrismaClient) {
  // Sequential reads: concurrent prisma queries on adapter-pg can hit the same
  // pg Client and trigger DeprecationWarning (hard error in pg@9).
  const ships = await prisma.ship.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      uniconsole: true,
      rawData: true,
    },
  });
  const traits = await prisma.starshipTrait.findMany({
    select: { id: true, name: true, obtained: true },
  });
  const infoboxes = await prisma.infobox.findMany({
    select: { id: true, name: true },
  });
  const modifiers = await prisma.modifier.findMany({
    select: { id: true, available: true },
  });
  const masteries = await prisma.mastery.findMany();
  const gwRows = await prisma.gwObtain.findMany();
  const swRows = await prisma.swObtain.findMany();

  const shipByName = nameIdMap(ships);
  const traitByName = nameIdMap(traits);
  const infoboxByName = nameIdMap(infoboxes);

  // --- ShipType taxonomy (Mastery.masterypackage / Ships.type) ---
  const typeNames = new Set<string>();
  for (const s of ships) {
    if (s.type) typeNames.add(normalizeShipType(s.type));
  }

  for (const m of masteries) {
    if (m.masterypackage) typeNames.add(normalizeShipType(m.masterypackage));
  }

  const shipTypeIdByName = new Map<string, number>();
  for (const name of typeNames) {
    const row = await prisma.shipType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    shipTypeIdByName.set(name, row.id);
  }

  for (const ship of ships) {
    const typeKey = ship.type ? normalizeShipType(ship.type) : null;
    const shipTypeId = typeKey ? (shipTypeIdByName.get(typeKey) ?? null) : null;

    const raw = ship.rawData as Record<string, unknown> | null;
    const uniconsole =
      ship.uniconsole ??
      (typeof raw?.uniconsole === "string" ? raw.uniconsole : null);
    const uniconsoleId = uniconsole
      ? (infoboxByName.get(uniconsole) ?? null)
      : null;

    await prisma.ship.update({
      where: { id: ship.id },
      data: { shipTypeId, uniconsole, uniconsoleId },
    });
  }

  // --- StarshipTrait.obtained -> Ships (M:N) ---
  await prisma.starshipTraitShip.deleteMany();
  const traitShipRows: { starshipTraitId: number; shipId: number }[] = [];
  for (const trait of traits) {
    for (const target of extractWikiTargets(trait.obtained)) {
      const shipId = shipByName.get(target);
      if (shipId) {
        traitShipRows.push({ starshipTraitId: trait.id, shipId });
      }
    }
  }
  if (traitShipRows.length) {
    await prisma.starshipTraitShip.createMany({
      data: traitShipRows,
      skipDuplicates: true,
    });
  }

  // --- Mastery.trait* -> StarshipTrait ---
  for (const m of masteries) {
    const shipTypeId = m.masterypackage
      ? (shipTypeIdByName.get(normalizeShipType(m.masterypackage)) ?? null)
      : null;

    await prisma.mastery.update({
      where: { id: m.id },
      data: {
        traitId: m.trait ? (traitByName.get(m.trait) ?? null) : null,
        trait2Id: m.trait2 ? (traitByName.get(m.trait2) ?? null) : null,
        trait3Id: m.trait3 ? (traitByName.get(m.trait3) ?? null) : null,
        acctraitId: m.acctrait ? (traitByName.get(m.acctrait) ?? null) : null,
        shipTypeId,
      },
    });
  }

  // --- Gw/SwObtain.lb -> Infobox ("{lb}" Lock Box) ---
  for (const row of gwRows) {
    const lockBoxId = row.lb
      ? (infoboxByName.get(`${row.lb} Lock Box`) ?? null)
      : null;
    await prisma.gwObtain.update({
      where: { id: row.id },
      data: { lockBoxId },
    });
  }

  for (const row of swRows) {
    const lockBoxId = row.lb
      ? (infoboxByName.get(`${row.lb} Lock Box`) ?? null)
      : null;
    await prisma.swObtain.update({
      where: { id: row.id },
      data: { lockBoxId },
    });
  }

  // --- Modifier.available -> Infobox (M:N) ---
  await prisma.modifierItem.deleteMany();
  const modifierItems: { modifierId: number; infoboxId: number }[] = [];
  for (const mod of modifiers) {
    for (const itemName of splitList(mod.available)) {
      const infoboxId = infoboxByName.get(itemName);
      if (infoboxId) {
        modifierItems.push({ modifierId: mod.id, infoboxId });
      }
    }
  }
  if (modifierItems.length) {
    await prisma.modifierItem.createMany({
      data: modifierItems,
      skipDuplicates: true,
    });
  }

  console.log("Relations linked:", {
    shipTypes: shipTypeIdByName.size,
    traitShips: traitShipRows.length,
    modifierItems: modifierItems.length,
  });
}
