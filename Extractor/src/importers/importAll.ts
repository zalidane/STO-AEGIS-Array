import { createPrismaClient } from "@sto-aegis/database";

import { importMappings } from "./importMappings.js";
import { importTable } from "./importTable.js";
import { loadState, saveState } from "./importState.js";
import { getFileHash } from "../extractors/getFileHash.js";
import { linkRelations } from "./linkRelations.js";

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
      const currentHash = await getFileHash(filePath);
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

    if (anyImported || forceImport) {
      console.log("Resolving relationships...");
      await linkRelations(prisma);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
