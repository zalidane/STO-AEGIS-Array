/**
 * Convert Special:CargoExport downloads into Extractor/output/*.json
 * in the same shape extractTable() writes from cargoquery.
 *
 * Usage (from Extractor/):
 *   npx tsx src/scripts/convertCargoExport.ts --input /path/to/raw --output output
 *
 * Only tables present in --input are written. Missing files (for example
 * TraySkill.json or SetBonus.json) are left untouched in --output.
 * Infobox `image` stamps are copied from the current output/committed file
 * by name+type; new rows get null.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

import {
  applyInfoboxImageStamps,
  buildInfoboxImageStamps,
  convertCargoExportRows,
  fieldOrderFromCommitted,
  serializeCargoJson,
  type CargoRow,
  type InfoboxStamp,
  type StringCargoRow,
} from "../utils/convertCargoExport.js";

const DEFAULT_TABLES = [
  "Infobox",
  "Mastery",
  "Reputation",
  "SetBonus",
  "Ships",
  "StarshipTraits",
  "Traits",
  "TraySkill",
  "GwObtain",
  "SwObtain",
  "Modifiers",
] as const;

type Options = {
  inputDir: string;
  outputDir: string;
  committedDir: string;
  tables: string[];
};

function parseArgs(argv: string[]): Options {
  let inputDir = "";
  let outputDir = "output";
  let committedDir = "";
  const tables: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--input" && next) {
      inputDir = next;
      i += 1;
    } else if (arg === "--output" && next) {
      outputDir = next;
      i += 1;
    } else if ((arg === "--committed" || arg === "--stamps") && next) {
      committedDir = next;
      i += 1;
    } else if (arg === "--table" && next) {
      tables.push(next);
      i += 1;
    } else {
      throw new Error(
        `Unknown or incomplete argument "${arg}". Use: --input DIR [--output DIR] [--committed DIR] [--table Name]`,
      );
    }
  }

  if (!inputDir) {
    throw new Error("Required: --input DIR (folder of CargoExport JSON files)");
  }

  return {
    inputDir: resolve(inputDir),
    outputDir: resolve(outputDir),
    committedDir: resolve(committedDir || outputDir),
    tables: tables.length > 0 ? tables : [...DEFAULT_TABLES],
  };
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function listInputTables(inputDir: string, wanted: readonly string[]): string[] {
  const present = new Set(
    readdirSync(inputDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/i, "")),
  );
  return wanted.filter((table) => present.has(table));
}

async function convertTable(
  table: string,
  options: Options,
): Promise<{ table: string; rows: number; outputPath: string }> {
  const inputPath = resolve(options.inputDir, `${table}.json`);
  const outputPath = resolve(options.outputDir, `${table}.json`);
  const committedPath = resolve(options.committedDir, `${table}.json`);

  const raw = await readJson<unknown>(inputPath);
  if (!Array.isArray(raw)) {
    throw new Error(`${basename(inputPath)} is not a JSON array`);
  }

  const committed = (await readJson<StringCargoRow[]>(committedPath)) ?? [];
  const fieldOrder = fieldOrderFromCommitted(committed);
  let rows = convertCargoExportRows(raw as CargoRow[], fieldOrder);

  if (table === "Infobox") {
    const stamps = buildInfoboxImageStamps(committed as InfoboxStamp[]);
    rows = applyInfoboxImageStamps(rows, stamps);
  }

  await mkdir(options.outputDir, { recursive: true });
  await writeFile(outputPath, serializeCargoJson(rows), "utf8");
  return { table, rows: rows.length, outputPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!statSync(options.inputDir).isDirectory()) {
    throw new Error(`Input directory not found: ${options.inputDir}`);
  }

  const tables = listInputTables(options.inputDir, options.tables);
  if (tables.length === 0) {
    throw new Error(`No Cargo tables found in ${options.inputDir}`);
  }

  const skipped = options.tables.filter((table) => !tables.includes(table));
  for (const table of tables) {
    const result = await convertTable(table, options);
    console.log(`${result.table}: wrote ${result.rows} rows to ${result.outputPath}`);
  }
  for (const table of skipped) {
    console.log(`${table}: no input file, left output untouched`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
