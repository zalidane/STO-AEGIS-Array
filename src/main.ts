import "dotenv/config";
import { extractTable, getFields } from "./extractors/extractTable.js";
import { shouldRefresh } from "./extractors/cache.js";
import { tableSchemas } from "./extractors/schemas/schemaList.js";
import { importAll } from "./importers/importAll.js";

const forceRefresh = process.argv.includes("--force-refresh");

async function main() {
  for (const table of tableSchemas) {
    const outputFile = `output/${table}.json`;

    if (!forceRefresh && !(await shouldRefresh(outputFile))) {
      console.log(`${table}: cache is fresh, skipping...`);
      continue;
    }

    console.log(`${table} is stale or missing, extracting...`);

    const fields = await getFields(table);

    if (fields.length === 0) {
      console.warn(`No fields found for ${table}, skipping...`);
      continue;
    }

    await extractTable(table, fields);
  }

  await importAll();
}

main().catch(console.error);
