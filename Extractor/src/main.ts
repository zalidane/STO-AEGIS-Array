import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  extractTable,
  tryGetFields,
} from "./extractors/extractTable.js";
import { extractImages } from "./extractors/extractImages.js";
import { shouldRefresh } from "./extractors/cache.js";
import { tableSchemas } from "./extractors/schemas/schemaList.js";
import { WikiClient } from "./wiki/client.js";
import { loadWikiConfig, WikiConfigError } from "./wiki/config.js";

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
    forceImages: argv.includes("--force-images"),
    skipImages: argv.includes("--skip-images"),
    imagesOnly: argv.includes("--images-only"),
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

async function runExtract(options: {
  forceRefresh: boolean;
  forceImages: boolean;
  skipImages: boolean;
  imagesOnly: boolean;
}) {
  const wiki = new WikiClient(loadWikiConfig(process.env, "output"));
  let loggedIn = false;
  const ensureLogin = async () => {
    if (loggedIn) return;
    await wiki.login();
    loggedIn = true;
  };

  if (!options.imagesOnly) {
    for (const table of tableSchemas) {
      const outputFile = `output/${table}.json`;

      if (!options.forceRefresh && !(await shouldRefresh(outputFile))) {
        console.log(`${table}: cache is fresh, skipping...`);
        continue;
      }

      console.log(`${table} is stale or missing, extracting...`);
      await ensureLogin();

      const fields = await tryGetFields(wiki, table);

      if (fields === null) {
        console.log(
          `${table}: unable to reach STOWiki, using local data if available`,
        );
        continue;
      }

      await extractTable(wiki, table, fields);
    }

    console.log(
      "Cargo extract complete. Commit Extractor/output/*.json when ready for production import.",
    );

    await ensureLogin();
    const { extractShipExperimentalWeapons } = await import(
      "./extractors/extractShipExperimentalWeapons.js"
    );
    await extractShipExperimentalWeapons(wiki, {
      force: options.forceRefresh,
    });
  }

  if (options.skipImages) {
    console.log("Images: skipped (--skip-images)");
    return;
  }

  const root = monorepoRoot();
  await extractImages(wiki, {
    cargoDir: resolve(process.cwd(), "output"),
    imagesDir: resolve(root, "VueUI/public/images"),
    force: options.forceImages,
  });
  console.log(
    "Image extract complete. Files land in VueUI/public/images/{items,ships,traits,starship-traits,tray-skills}/.",
  );
}

async function runImport(forceImport: boolean) {
  // Dynamic import so createPrismaClient runs after loadEnv().
  const { importAll } = await import("./importers/importAll.js");
  await importAll(forceImport);
}

async function main() {
  const {
    command,
    forceRefresh,
    forceImport,
    forceImages,
    skipImages,
    imagesOnly,
    prod,
  } = parseArgs(process.argv.slice(2));

  loadEnv(prod);

  if (command === "extract") {
    if (prod) {
      console.warn(
        "Note: extract is a manual/local operation; --prod only affects which .env file is loaded (not used for wiki fetch).",
      );
    }
    await runExtract({ forceRefresh, forceImages, skipImages, imagesOnly });
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
  if (err instanceof WikiConfigError) {
    console.error(err.message);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
