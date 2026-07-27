import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

import { importMappings } from "./importMappings.js";
import { importTable } from "./importTable.js";
import { loadState, saveState } from "./importState.js";
import { getFileHash } from "../extractors/getFileHash.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });
console.log(Object.keys(prisma));
export async function importAll() {
  const state = await loadState();

  for (const [table, model] of Object.entries(importMappings)) {
    const filePath = `output/${table}.json`;
    const currentHash = await getFileHash(filePath);
    const previousHash = state[table]?.hash;
    if (currentHash === previousHash) {
      console.log(`${table}: unchanged, skipping`);
      continue;
    }

    console.log(`Importing ${table} using model ${model}`);
    await importTable(prisma, table, model);

    state[table] = {
      hash: currentHash,
      lastImported: new Date().toISOString(),
    };

    await saveState(state);
  }
}
