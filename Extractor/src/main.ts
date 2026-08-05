import { config } from "dotenv";
import { resolve } from "node:path";

import {
  extractTable,
  tryGetFields,
} from "./extractors/extractTable.js";
import { shouldRefresh } from "./extractors/cache.js";
import { tableSchemas } from "./extractors/schemas/schemaList.js";
import { importAll } from "./importers/importAll.js";

type Command = "extract" | "import";

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const command = (positional[0] ?? "extract") as Command;
  if (command !== "extract" && command !== "import") {
    throw new Error(
      `Unknown command "${command}". Use: extract | import`,
    );
  }

  return {
    command,
    forceRefresh: argv.includes("--force-refresh"),
    forceImport: argv.includes("--force-import"),
    prod: argv.includes("--prod"),
  };
}

function loadEnv(prod: boolean) {
  if (prod) {
    process.env.PRISMA_ENV = "production";
    if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
    config({
      path: resolve(process.cwd(), "../.env.production"),
      override: true,
    });
    config({
      path: resolve(process.cwd(), ".env.production"),
      override: true,
    });
    return;
  }

  config({ path: resolve(process.cwd(), "../.env") });
  config({ path: resolve(process.cwd(), ".env") });
}

async function runExtract(forceRefresh: boolean) {
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

  console.log(
    "Extract complete. Commit Extractor/output/*.json when ready for production import.",
  );
}

async function runImport(forceImport: boolean) {
  await importAll(forceImport);
}

async function main() {
  const { command, forceRefresh, forceImport, prod } = parseArgs(
    process.argv.slice(2),
  );

  loadEnv(prod);

  if (command === "extract") {
    if (prod) {
      console.warn(
        "Note: extract is a manual/local operation; --prod only affects which .env file is loaded (not used for wiki fetch).",
      );
    }
    await runExtract(forceRefresh);
    return;
  }

  await runImport(forceImport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
