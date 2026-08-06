import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  extractTable,
  tryGetFields,
} from "./extractors/extractTable.js";
import { shouldRefresh } from "./extractors/cache.js";
import { tableSchemas } from "./extractors/schemas/schemaList.js";

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

function monorepoRoot(): string {
  // Extractor/src → ../..
  return resolve(__dirname, "../..");
}

function loadEnv(prod: boolean) {
  const root = monorepoRoot();
  const candidates = prod
    ? [
        resolve(root, ".env.production"),
        resolve(process.cwd(), "../.env.production"),
        resolve(process.cwd(), ".env.production"),
      ]
    : [
        resolve(root, ".env"),
        resolve(process.cwd(), "../.env"),
        resolve(process.cwd(), ".env"),
      ];

  if (prod) {
    process.env.PRISMA_ENV = "production";
    if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
  }

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const result = config({ path, override: true });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      console.log(`Loaded env from ${path}`);
      return;
    }
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      prod
        ? "No .env.production found and DATABASE_URL is unset."
        : "No .env found and DATABASE_URL is unset.",
    );
  }
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
  // Dynamic import so createPrismaClient runs after loadEnv().
  const { importAll } = await import("./importers/importAll.js");
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

  if (!process.env.DATABASE_URL) {
    throw new Error(
      prod
        ? "DATABASE_URL missing. Set it in monorepo root .env.production or the environment."
        : "DATABASE_URL missing. Set it in monorepo root .env or the environment.",
    );
  }

  console.log(
    `Importing into ${prod ? "production" : "local"} database host: ${
      new URL(process.env.DATABASE_URL).host
    }`,
  );

  await runImport(forceImport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
