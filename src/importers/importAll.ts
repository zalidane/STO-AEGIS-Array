import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

import { importMappings } from "./importMappings.js";
import { importTable } from "./importTable.js";
import { loadState, saveState } from "./importState.js";
import { getFileHash } from "../extractors/getFileHash.js";
import type { ImportConfig } from "./importConfig.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export async function importAll(forceImport = false) {
  const state = await loadState();

  for (const [table, config] of Object.entries(importMappings)) {
    const filePath = `output/${table}.json`;
    const currentHash = await getFileHash(filePath);
    const previousHash = state[table]?.hash;

    if (!forceImport && currentHash === previousHash) {
      console.log(`${table}: unchanged, skipping`);
      continue;
    }

    console.log(
      `Importing ${table} → ${config.model}${forceImport ? " (forced)" : ""}`,
    );

    const imported = await importTable(
      prisma,
      table,
      config as ImportConfig<any, any>,
    );

    if (!imported) {
      console.error(`${table}: import failed — state not updated`);
      continue;
    }

    state[table] = {
      hash: currentHash,
      lastImported: new Date().toISOString(),
    };

    await saveState(state);
  }
}
