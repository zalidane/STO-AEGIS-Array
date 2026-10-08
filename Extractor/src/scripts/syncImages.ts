/**
 * Sync VueUI/public/images/{items,ships,traits,starship-traits,tray-skills}
 * to an S3-compatible bucket (Cloudflare R2).
 *
 * Credentials come only from the environment or the repo-root .env file:
 *   R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_REGION optional, default auto
 *
 * Usage (from the monorepo root):
 *   npm run images:sync
 *   npm run images:sync -- --dry-run
 *   npm run images:sync -- --delete
 *
 * --delete removes remote objects under those prefixes that are not on disk.
 * It is off by default. See docs/image-hosting.md.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { readR2Config, type ObjectStore } from "../images/imageObjects.js";
import { createR2ObjectStore } from "../images/r2ObjectStore.js";
import { syncWikiImages, type SyncReport } from "../images/syncWikiImages.js";

function extractorRoot(): string {
  return resolve(__dirname, "../..");
}

function monorepoRoot(): string {
  return resolve(extractorRoot(), "..");
}

function loadLocalEnv(root: string): void {
  const path = resolve(root, ".env");
  if (!existsSync(path)) return;
  config({ path, override: false });
  console.log(`Loaded env from ${path}`);
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  deleteExtraneous: boolean;
} {
  let dryRun = false;
  let deleteExtraneous = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--delete") deleteExtraneous = true;
    else {
      throw new Error(
        `Unknown argument "${arg}". Use --dry-run and/or --delete.`,
      );
    }
  }
  return { dryRun, deleteExtraneous };
}

function printKeys(label: string, keys: readonly string[]): void {
  console.log(`${label}: ${keys.length}`);
  const preview = keys.slice(0, 20);
  for (const key of preview) console.log(`  ${key}`);
  if (keys.length > preview.length) {
    console.log(`  … ${keys.length - preview.length} more`);
  }
}

function printReport(report: SyncReport): void {
  const uploadLabel = report.dryRun ? "Would upload" : "Uploaded";
  const deleteLabel = report.dryRun ? "Would delete" : "Deleted";
  printKeys(uploadLabel, report.uploaded);
  if (report.comparedRemote) {
    console.log(`Unchanged: ${report.unchanged}`);
  } else {
    console.log(
      "Remote not compared (R2 settings unset). Every local image would upload once credentials are set.",
    );
  }
  if (report.deleted.length > 0 || report.comparedRemote) {
    printKeys(deleteLabel, report.deleted);
  }
  const types = Object.entries(report.contentTypes).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  console.log("Content-Type counts:");
  for (const [type, count] of types) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(`Skipped: ${report.skipped.length}`);
  for (const skip of report.skipped.slice(0, 20)) {
    console.log(`  ${skip.path}: ${skip.reason}`);
  }
  if (report.skipped.length > 20) {
    console.log(`  … ${report.skipped.length - 20} more`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = monorepoRoot();
  loadLocalEnv(root);
  const imagesDir = resolve(root, "VueUI/public/images");

  let store: ObjectStore | null = null;
  try {
    store = createR2ObjectStore(readR2Config(process.env));
  } catch (error) {
    if (!args.dryRun) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.log(message);
  }

  const report = await syncWikiImages({
    imagesDir,
    store,
    dryRun: args.dryRun || store === null,
    deleteExtraneous: args.deleteExtraneous,
    ...(store && !args.dryRun
      ? { onUpload: (key: string) => console.log(`put ${key}`) }
      : {}),
  });
  printReport(report);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
