import { existsSync } from "node:fs";
import { createPrismaClient } from "@sto-aegis/database";

import { importMappings } from "./importMappings.js";
import { importTable } from "./importTable.js";
import { loadState, saveState } from "./importState.js";
import { getFileHash } from "../extractors/getFileHash.js";
import { linkRelations } from "./linkRelations.js";
import { SHIP_EXPERIMENTAL_WEAPONS_PATH } from "../extractors/extractShipExperimentalWeapons.js";
import {
  catalogSupplementFingerprint,
  payloadsFromCatalogSupplementRows,
  prismaCatalogSupplementReader,
} from "./catalogSupplement.js";

import type { PrismaClient } from "@sto-aegis/database";
import type { ImportConfig } from "./importConfig.js";

const IMPORT_ORDER = [
  "Infobox",
  "Ships",
  "StarshipTraits",
  "Mastery",
  "Modifiers",
  "GwObtain",
  "SwObtain",
  "Reputation",
  "SetBonus",
  "Traits",
  "TraySkill",
] as const;

class CatalogSupplementReadError extends Error {}

function supplementFileOf(config: object): string | undefined {
  if (!("supplementFile" in config)) return undefined;
  const path = (config as { supplementFile?: string }).supplementFile;
  return path;
}

function supplementKindOf(config: object): string | undefined {
  if (!("supplementKind" in config)) return undefined;
  const kind = (config as { supplementKind?: string }).supplementKind;
  return kind;
}

/**
 * Cargo hash, plus a committed file when a mapping still has one, and a
 * CatalogSupplement fingerprint when the mapping sets `supplementKind`.
 * A database edit changes the fingerprint, so the next import merges it
 * without a Cargo or repository change.
 */
async function tableImportHash(
  prisma: PrismaClient,
  filePath: string,
  config: object,
): Promise<string> {
  const parts = [await getFileHash(filePath)];
  const supplementPath = supplementFileOf(config);
  if (supplementPath && existsSync(supplementPath)) {
    parts.push(await getFileHash(supplementPath));
  }
  const supplementKind = supplementKindOf(config);
  if (supplementKind) {
    try {
      const stored =
        await prismaCatalogSupplementReader(prisma).findByKind(supplementKind);
      payloadsFromCatalogSupplementRows(stored);
      parts.push(catalogSupplementFingerprint(stored));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CatalogSupplementReadError(`${supplementKind}: ${message}`);
    }
  }
  return parts.join(":");
}

export async function importAll(forceImport = false) {
  // Create client only after env is loaded (see main.ts loadEnv).
  const { prisma, pool } = createPrismaClient();

  try {
    const state = await loadState();
    let anyImported = false;

    for (const table of IMPORT_ORDER) {
      const config = importMappings[table];
      if (!config) continue;

      const filePath = `output/${table}.json`;
      let currentHash: string;
      try {
        currentHash = await tableImportHash(prisma, filePath, config);
      } catch (error) {
        if (!(error instanceof CatalogSupplementReadError)) throw error;
        console.error(
          `${table}: could not read CatalogSupplement (${error.message}). Apply database migrations before import.`,
        );
        continue;
      }
      const previousHash = state[table]?.hash;

      if (!forceImport && currentHash === previousHash) {
        console.log(`${table}: unchanged, skipping`);
        continue;
      }

      console.log(`Importing ${table} → ${config.model}`);
      const imported = await importTable(
        prisma,
        table,
        config as ImportConfig<any, any>,
      );

      if (!imported) {
        console.error(`${table}: import failed — state not updated`);
        continue;
      }

      anyImported = true;
      state[table] = {
        hash: currentHash,
        lastImported: new Date().toISOString(),
      };
      await saveState(state);
    }

    const experimentalHash = existsSync(SHIP_EXPERIMENTAL_WEAPONS_PATH)
      ? await getFileHash(SHIP_EXPERIMENTAL_WEAPONS_PATH)
      : null;
    const experimentalChanged =
      experimentalHash != null &&
      experimentalHash !== state.ShipExperimentalWeapons?.hash;

    if (anyImported || forceImport || experimentalChanged) {
      console.log("Resolving relationships...");
      await linkRelations(prisma);
      if (experimentalHash != null) {
        state.ShipExperimentalWeapons = {
          hash: experimentalHash,
          lastImported: new Date().toISOString(),
        };
        await saveState(state);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
