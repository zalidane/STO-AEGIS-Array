/**
 * Move files saved by the browser downloader's "Save to Downloads" fallback
 * (named `<kind>__<filename>`) into VueUI/public/images/<kind>/<filename>.
 *
 *   npm run images:import-downloads -- --from="C:\Users\me\Downloads"
 *   npm run images:import-downloads -- --from=~/Downloads --dry-run
 *
 * Existing files are left alone. The newest browser-download-report*.json is
 * copied to VueUI/public/images/browser-download-report.json.
 */
import { copyFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { planDownloadMoves } from "../images/browserDownloadImport.js";

function parseArgs(argv: string[]): { from: string; dryRun: boolean } {
  let from = "";
  let dryRun = false;
  for (const arg of argv) {
    if (arg.startsWith("--from=")) from = arg.slice("--from=".length);
    else if (arg === "--dry-run") dryRun = true;
    else throw new Error(`Unknown argument "${arg}". Use --from=<dir> [--dry-run].`);
  }
  if (!from) throw new Error('Pass --from=<downloads folder>, e.g. --from="%USERPROFILE%\\Downloads".');
  if (from.startsWith("~")) from = join(homedir(), from.slice(1));
  return { from: resolve(from), dryRun };
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

async function main(): Promise<void> {
  const { from, dryRun } = parseArgs(process.argv.slice(2));
  const imagesDir = resolve(__dirname, "../../../VueUI/public/images");
  const names = await readdir(from);
  const existing = new Set<string>();
  for (const name of names) {
    const plan = planDownloadMoves([name]);
    for (const move of plan.moves) {
      if (await exists(join(imagesDir, move.kind, move.filename))) {
        existing.add(`${move.kind}/${move.filename}`);
      }
    }
  }
  const plan = planDownloadMoves(names, existing);
  for (const move of plan.moves) {
    const target = join(imagesDir, move.kind, move.filename);
    console.log(`${dryRun ? "would move" : "move"} ${move.source} -> ${move.kind}/${move.filename}`);
    if (dryRun) continue;
    await mkdir(join(imagesDir, move.kind), { recursive: true });
    await copyFile(join(from, move.source), target);
    await unlink(join(from, move.source));
  }
  if (plan.report) {
    console.log(`${dryRun ? "would copy" : "copy"} ${plan.report} -> browser-download-report.json`);
    if (!dryRun) {
      await copyFile(join(from, plan.report), join(imagesDir, "browser-download-report.json"));
    }
  }
  console.log(
    `Moved ${dryRun ? 0 : plan.moves.length} (planned ${plan.moves.length}), already present ${plan.alreadyPresent.length}.`,
  );
  console.log("Next: npm run extract:images:offline, then npm run images:sync -- --dry-run");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
