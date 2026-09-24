/**
 * Home-machine monthly extract gate.
 *
 * Checks last-extract.json (gitignored) — or cargo JSON mtimes as fallback —
 * and runs extract only when more than ~1 month has passed. Production/Railway
 * must never run this.
 *
 * When due, runs `extract --force-refresh` so Cargo tables always re-fetch
 * (avoids the 24h mtime gate skipping after a fresh clone). Images and the
 * experimental-weapon sidecar stay incremental (no --force-images).
 *
 * Usage (from monorepo root):
 *   npm run extract:home
 *   npm run extract:home -- --force
 *   npm run extract:home -- --check-only
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

import {
  ONE_MONTH_MS,
  homeExtractReminder,
  isExtractDue,
  resolveLastExtractAt,
  writeLastExtractState,
} from "../extractors/homeExtractSchedule.js";

function parseArgs(argv: string[]) {
  return {
    force: argv.includes("--force"),
    checkOnly: argv.includes("--check-only") || argv.includes("--dry-run"),
  };
}

function extractorRoot(): string {
  // Extractor/src/scripts → ../..
  return resolve(__dirname, "../..");
}

function monorepoRoot(): string {
  return resolve(extractorRoot(), "..");
}

function runExtract(forceRefresh: boolean): Promise<number> {
  const extractorDir = extractorRoot();
  // When the monthly gate says due, force Cargo refresh so a fresh git
  // checkout (mtime = now) cannot skip wiki contact via the 24h cache.
  // Do not pass --force-images: keep image downloads incremental.
  const args = ["src/main.ts", "extract"];
  if (forceRefresh) args.push("--force-refresh");

  return new Promise((resolvePromise, reject) => {
    const child = spawn("npx", ["tsx", ...args], {
      cwd: extractorDir,
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolvePromise(code ?? 1);
    });
  });
}

async function main() {
  const { force, checkOnly } = parseArgs(process.argv.slice(2));
  const outputDir = resolve(extractorRoot(), "output");
  const lastExtractAt = await resolveLastExtractAt(outputDir);
  const decision = isExtractDue(lastExtractAt, new Date(), ONE_MONTH_MS);

  console.log("Home extract check (local / residential IP only)");
  console.log(
    `  last extract: ${
      decision.lastExtractAt
        ? decision.lastExtractAt.toISOString()
        : "(none)"
    }`,
  );
  console.log(`  decision: ${decision.reason}`);

  if (!force && !decision.due) {
    console.log("Skipping extract (< 1 month since last run).");
    console.log("Pass --force to run anyway.");
    process.exit(0);
  }

  if (force && !decision.due) {
    console.log("Running extract because --force was set.");
  }

  if (checkOnly) {
    console.log(
      "Check only: would run `extract --force-refresh` (Cargo full refresh; images incremental).",
    );
    console.log(homeExtractReminder());
    process.exit(0);
  }

  console.log(
    "Running extract --force-refresh (Cargo full refresh; images stay incremental)…",
  );
  const code = await runExtract(true);
  if (code !== 0) {
    console.error(`Extract exited with code ${code}`);
    process.exit(code);
  }

  // main.ts also stamps last-extract.json; write again so source is clear.
  await writeLastExtractState(outputDir, new Date(), "home-extract");
  console.log(homeExtractReminder());
  console.log(`Monorepo root for git/commit: ${monorepoRoot()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
