import { config } from "dotenv";
import { resolve } from "node:path";

// Prefer monorepo root .env, then local Extractor/.env
config({ path: resolve(process.cwd(), "../.env") });
config({ path: resolve(process.cwd(), ".env") });

import {
  extractTable,
  tryGetFields,
} from "./extractors/extractTable.js";
import { shouldRefresh } from "./extractors/cache.js";
import { tableSchemas } from "./extractors/schemas/schemaList.js";
import { importAll } from "./importers/importAll.js";

const forceRefresh = process.argv.includes("--force-refresh");
const forceImport = process.argv.includes("--force-import");

async function main() {
  for (const table of tableSchemas) {
    const outputFile = `output/${table}.json`;

    if (!forceRefresh && !(await shouldRefresh(outputFile))) {
      console.log(`${table}: cache is fresh, skipping...`);
      continue;
    }

    console.log(`${table} is stale or missing, extracting...`);

    const fields = await tryGetFields(table);

    if (fields === null) {
      console.log(
        `${table}: unable to reach STOWiki, using local data if available`,
      );
      continue;
    }

    await extractTable(table, fields);
  }

  await importAll(forceImport);
}

main().catch(console.error);
