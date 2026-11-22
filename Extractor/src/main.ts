import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  extractTable,
  tryGetFields,
} from "./extractors/extractTable.js";
import { extractImages } from "./extractors/extractImages.js";
import { shouldRefresh } from "./extractors/cache.js";
import { writeLastExtractState } from "./extractors/homeExtractSchedule.js";
import { tableSchemas } from "./extractors/schemas/schemaList.js";
import { WikiClient } from "./wiki/client.js";
import { loadWikiConfig, WikiConfigError } from "./wiki/config.js";
import { readR2Config, type ObjectStore } from "./images/imageObjects.js";
import { createR2ObjectStore } from "./images/r2ObjectStore.js";
import { resolveImageBaseUrl } from "./images/remoteImagePresence.js";

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
    // --plan implies images-only: print the image fetch plan, touch nothing.
    imagesOnly:
      argv.includes("--images-only") ||
      argv.includes("--plan") ||
      argv.some((a) => a === "--browser-script" || a.startsWith("--browser-script=")),
    imagesPlan:
      argv.includes("--plan") ||
      argv.some((a) => a === "--browser-script" || a.startsWith("--browser-script=")),
    // Write the planned fetch list as a DevTools console downloader.
    browserScript: (() => {
      const flag = argv.find((a) => a === "--browser-script" || a.startsWith("--browser-script="));
      if (!flag) return null;
      return flag.includes("=") ? flag.slice(flag.indexOf("=") + 1) : "output/browser-download.js";
    })(),
    // Never contact the wiki; record unfetched titles as failed/missing.
    noFetch: argv.includes("--no-fetch") || argv.includes("--offline"),
    remoteCheck: !argv.includes("--no-remote-check"),
    imageBaseUrl:
      argv
        .find((a) => a.startsWith("--image-base-url="))
        ?.slice("--image-base-url=".length) ?? null,
    prod: argv.includes("--prod"),
    // Railway pre-deploy: platform env only, hashes in the database, and a
    // non-zero exit when any table fails so the deploy stops.
    deploy: argv.includes("--deploy"),
    stateStore: (argv.includes("--deploy") || argv.includes("--state=db")
      ? "db"
      : "file") as "file" | "db",
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
  imagesPlan: boolean;
  browserScript: string | null;
  noFetch: boolean;
  remoteCheck: boolean;
  imageBaseUrl: string | null;
}) {
  const cargoDir = resolve(process.cwd(), "output");
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
      // Sidecar is incremental (new experimental hulls only).
      // --force-refresh applies to Cargo tables; delete
      // output/ShipExperimentalWeapons.json to rebuild the map.
      force: false,
    });
  }

  if (options.skipImages) {
    console.log("Images: skipped (--skip-images)");
  } else {
    const root = monorepoRoot();
    const result = await extractImages(wiki, {
      cargoDir,
      imagesDir: resolve(root, "VueUI/public/images"),
      force: options.forceImages,
      plan: options.imagesPlan,
      remoteCheck: options.remoteCheck,
      store: options.remoteCheck ? optionalR2Store() : null,
      imageBaseUrl: resolveImageBaseUrl(options.imageBaseUrl, process.env),
      noFetch: options.noFetch,
    });
    if (options.browserScript) {
      const { browserDownloadEntries, buildBrowserDownloadScript } = await import(
        "./images/browserDownloadScript.js"
      );
      const entries = browserDownloadEntries(result.toFetch);
      const outPath = resolve(process.cwd(), options.browserScript);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, await buildBrowserDownloadScript(entries));
      console.log(
        `Images: wrote browser downloader for ${entries.length} files to ${outPath}. Paste it into the DevTools console on a https://stowiki.net tab.`,
      );
    }
    if (options.imagesPlan) return;
    console.log(
      "Image extract complete. Files land in VueUI/public/images/{items,ships,traits,starship-traits,tray-skills}/.",
    );
    console.log(
      "Sync changed files to object storage with: npm run images:sync",
    );
  }

  // Local-only stamp for the monthly home check (gitignored).
  await writeLastExtractState(cargoDir, new Date(), "extract");
}

/** R2 store from the images:sync settings, or null when they are not set. */
function optionalR2Store(): ObjectStore | null {
  try {
    return createR2ObjectStore(readR2Config(process.env));
  } catch {
    return null;
  }
}

async function runImport(
  forceImport: boolean,
  stateStore: "file" | "db",
  strict: boolean,
) {
  // Dynamic import so createPrismaClient runs after loadEnv().
  const { importAll } = await import("./importers/importAll.js");
  const result = await importAll(forceImport, { stateStore });
  if (strict && result.failed.length > 0) {
    console.error(
      `Import failed for: ${result.failed.join(", ")}. Exiting non-zero so the deploy stops; fix the JSON or database and redeploy.`,
    );
    process.exitCode = 1;
  }
}

async function main() {
  const {
    command,
    forceRefresh,
    forceImport,
    forceImages,
    skipImages,
    imagesOnly,
    imagesPlan,
    browserScript,
    noFetch,
    remoteCheck,
    imageBaseUrl,
    prod,
    deploy,
    stateStore,
  } = parseArgs(process.argv.slice(2));

  if (deploy) {
    // Railway injects DATABASE_URL; never let a stray .env file override it.
    if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
  } else {
    loadEnv(prod);
  }

  if (command === "extract") {
    if (prod) {
      console.warn(
        "Note: extract is a manual/local operation; --prod only affects which .env file is loaded (not used for wiki fetch).",
      );
    }
    await runExtract({
      forceRefresh,
      forceImages,
      skipImages,
      imagesOnly,
      imagesPlan,
      browserScript,
      noFetch,
      remoteCheck,
      imageBaseUrl,
    });
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      prod
        ? "DATABASE_URL missing. Set it in monorepo root .env.production or the environment."
        : deploy
          ? "DATABASE_URL missing. On Railway set it on this service to ${{Postgres.DATABASE_URL}}."
          : "DATABASE_URL missing. Set it in monorepo root .env or the environment.",
    );
  }

  console.log(
    `Importing into ${deploy ? "deploy" : prod ? "production" : "local"} database host: ${
      new URL(process.env.DATABASE_URL).host
    }`,
  );

  await runImport(forceImport, stateStore, deploy);
}

main().catch((err) => {
  if (err instanceof WikiConfigError) {
    console.error(err.message);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
