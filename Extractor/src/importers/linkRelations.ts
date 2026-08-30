import type { PrismaClient } from "@sto-aegis/database";
import {
  extractWikiTargets,
  splitList,
  normalizeShipType,
} from "../utils/parseRefs";
import {
  decodeHtmlEntities,
  decodeHtmlEntitiesOrNull,
} from "../utils/decodeHtmlEntities";
import { buildShipNameIdMap } from "../utils/shipNameLookup";
import { loadExperimentalWeaponMap } from "../extractors/extractShipExperimentalWeapons";
import {
  dedupeShipsByDecodedName,
  dedupeStarshipTraitsByDecodedName,
} from "./dedupeEncodedNames";

function nameIdMap(rows: { id: number; name: string }[]): Map<string, number> {
  return new Map(
    rows.map((row) => [decodeHtmlEntities(row.name), row.id] as const),
  );
}

export async function linkRelations(prisma: PrismaClient) {
  // Collapse Mat&#039;Ha / Mat'Ha style duplicates before linking.
  const shipDedupe = await dedupeShipsByDecodedName(prisma);
  const traitDedupe = await dedupeStarshipTraitsByDecodedName(prisma);

  // Sequential reads: concurrent prisma queries on adapter-pg can hit the same
  // pg Client and trigger DeprecationWarning (hard error in pg@9).
  const ships = await prisma.ship.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      tier: true,
      uniconsole: true,
      displayPrefix: true,
      displayClass: true,
      displayType: true,
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
  const experimentalByShip = await loadExperimentalWeaponMap();

  const shipByName = buildShipNameIdMap(ships);
  const traitByName = nameIdMap(traits);
  const infoboxByName = nameIdMap(infoboxes);
  const infoboxByNormalized = new Map(
    infoboxes.map(
      (row) => [normalizeInfoboxName(row.name), row.id] as const,
    ),
  );

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
    const uniconsoleRaw =
      ship.uniconsole ??
      (typeof raw?.uniconsole === "string" ? raw.uniconsole : null);
    const uniconsole = decodeHtmlEntitiesOrNull(uniconsoleRaw);
    const uniconsoleId = uniconsole
      ? (infoboxByName.get(uniconsole) ?? null)
      : null;
    const experimentalWeapon = experimentalWeaponName(
      ship.name,
      experimentalByShip,
    );
    const experimentalWeaponId = experimentalWeapon
      ? (infoboxByName.get(experimentalWeapon) ??
        infoboxByNormalized.get(normalizeInfoboxName(experimentalWeapon)) ??
        null)
      : null;

    await prisma.ship.update({
      where: { id: ship.id },
      data: {
        shipTypeId,
        uniconsole,
        uniconsoleId,
        experimentalWeapon,
        experimentalWeaponId,
      },
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

    const traitName = decodeHtmlEntitiesOrNull(m.trait);
    const trait2Name = decodeHtmlEntitiesOrNull(m.trait2);
    const trait3Name = decodeHtmlEntitiesOrNull(m.trait3);
    const acctraitName = decodeHtmlEntitiesOrNull(m.acctrait);

    await prisma.mastery.update({
      where: { id: m.id },
      data: {
        traitId: traitName ? (traitByName.get(traitName) ?? null) : null,
        trait2Id: trait2Name ? (traitByName.get(trait2Name) ?? null) : null,
        trait3Id: trait3Name ? (traitByName.get(trait3Name) ?? null) : null,
        acctraitId: acctraitName
          ? (traitByName.get(acctraitName) ?? null)
          : null,
        shipTypeId,
      },
    });
  }

  // --- Gw/SwObtain.lb -> Infobox ("{lb}" Lock Box) ---
  for (const row of gwRows) {
    const lb = decodeHtmlEntitiesOrNull(row.lb);
    const lockBoxId = lb ? (infoboxByName.get(`${lb} Lock Box`) ?? null) : null;
    await prisma.gwObtain.update({
      where: { id: row.id },
      data: { lockBoxId },
    });
  }

  for (const row of swRows) {
    const lb = decodeHtmlEntitiesOrNull(row.lb);
    const lockBoxId = lb ? (infoboxByName.get(`${lb} Lock Box`) ?? null) : null;
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
    encodedNameDedupe: {
      shipsMerged: shipDedupe.merged,
      shipsRenamed: shipDedupe.renamed,
      traitsMerged: traitDedupe.merged,
      traitsRenamed: traitDedupe.renamed,
    },
    shipTypes: shipTypeIdByName.size,
    traitShips: traitShipRows.length,
    modifierItems: modifierItems.length,
    experimentalWeapons: Object.values(experimentalByShip).filter(Boolean).length,
  });
}

function experimentalWeaponName(
  shipName: string,
  map: Record<string, string | null>,
): string | null {
  const decoded = decodeHtmlEntities(shipName);
  const named = map[shipName] ?? map[decoded] ?? null;
  return named?.trim() ? named.trim() : null;
}

function normalizeInfoboxName(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim().toLowerCase();
}
