import { existsSync } from "node:fs";
import { createPrismaClient } from "@sto-aegis/database";

import { importMappings } from "./importMappings.js";
import { importTable } from "./importTable.js";
import {
  dbStateStore,
  fileStateStore,
  type ImportStateDelegate,
  type ImportStateStore,
} from "./importState.js";
import { getFileHash } from "../extractors/getFileHash.js";
import { linkRelations } from "./linkRelations.js";
import { SHIP_EXPERIMENTAL_WEAPONS_PATH } from "../extractors/extractShipExperimentalWeapons.js";
import {
  catalogSupplementFingerprint,
  payloadsFromCatalogSupplementRows,
  prismaCatalogSupplementReader,
} from "./catalogSupplement.js";

import type { PrismaClient } from "@sto-aegis/database";
import type { ImportConfig } from "./importConfig.js";

const IMPORT_ORDER = [
  "Infobox",
  "Ships",
  "StarshipTraits",
  "Mastery",
  "Modifiers",
  "GwObtain",
  "SwObtain",
  "Reputation",
  "SetBonus",
  "Traits",
  "TraySkill",
] as const;

class CatalogSupplementReadError extends Error {}

function supplementFileOf(config: object): string | undefined {
  if (!("supplementFile" in config)) return undefined;
  const path = (config as { supplementFile?: string }).supplementFile;
  return path;
}

function supplementKindOf(config: object): string | undefined {
  if (!("supplementKind" in config)) return undefined;
  const kind = (config as { supplementKind?: string }).supplementKind;
  return kind;
}

/**
 * Cargo hash, plus a committed file when a mapping still has one, and a
 * CatalogSupplement fingerprint when the mapping sets `supplementKind`.
 * A database edit changes the fingerprint, so the next import merges it
 * without a Cargo or repository change.
 */
async function tableImportHash(
  prisma: PrismaClient,
  filePath: string,
  config: object,
): Promise<string> {
  const parts = [await getFileHash(filePath)];
  const supplementPath = supplementFileOf(config);
  if (supplementPath && existsSync(supplementPath)) {
    parts.push(await getFileHash(supplementPath));
  }
  const supplementKind = supplementKindOf(config);
  if (supplementKind) {
    try {
      const stored =
        await prismaCatalogSupplementReader(prisma).findByKind(supplementKind);
      payloadsFromCatalogSupplementRows(stored);
      parts.push(catalogSupplementFingerprint(stored));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CatalogSupplementReadError(`${supplementKind}: ${message}`);
    }
  }
  return parts.join(":");
}

export interface ImportAllOptions {
  /** Where per-table hashes live. Default `file` (output/importState.json). */
  stateStore?: "file" | "db";
}

export interface ImportAllResult {
  imported: string[];
  skipped: string[];
  failed: string[];
}

function resolveStateStore(
  prisma: PrismaClient,
  kind: "file" | "db",
): ImportStateStore {
  if (kind === "file") return fileStateStore;
  const model = (prisma as unknown as Record<string, unknown>)["importState"];
  if (!model) {
    throw new Error(
      "Prisma model importState not found. Run `npm run db:generate` after pulling the ImportState migration.",
    );
  }
  return dbStateStore(model as ImportStateDelegate);
}

export async function importAll(
  forceImport = false,
  options: ImportAllOptions = {},
): Promise<ImportAllResult> {
  // Create client only after env is loaded (see main.ts loadEnv).
  const { prisma, pool } = createPrismaClient();
  const result: ImportAllResult = { imported: [], skipped: [], failed: [] };

  try {
    const store = resolveStateStore(prisma, options.stateStore ?? "file");
    const state = await store.load();
    if (store.kind === "db") {
      console.log(
        `Import state: database (${Object.keys(state).length} table hash(es) on record)`,
      );
    }
    let anyImported = false;
    // Hashes are recorded only after linkRelations succeeds, so a failed
    // relink is retried on the next run instead of being skipped as unchanged.
    const pending: [string, { hash: string; lastImported: string }][] = [];

    for (const table of IMPORT_ORDER) {
      const config = importMappings[table];
      if (!config) continue;

      const filePath = `output/${table}.json`;
      let currentHash: string;
      try {
        currentHash = await tableImportHash(prisma, filePath, config);
      } catch (error) {
        if (!(error instanceof CatalogSupplementReadError)) throw error;
        console.error(
          `${table}: could not read CatalogSupplement (${error.message}). Apply database migrations before import.`,
        );
        result.failed.push(table);
        continue;
      }
      const previousHash = state[table]?.hash;

      if (!forceImport && currentHash === previousHash) {
        console.log(`${table}: unchanged, skipping`);
        result.skipped.push(table);
        continue;
      }

      console.log(`Importing ${table} → ${config.model}`);
      const imported = await importTable(
        prisma,
        table,
        config as ImportConfig<any, any>,
      );

      if (!imported) {
        console.error(`${table}: import failed — state not updated`);
        result.failed.push(table);
        continue;
      }

      anyImported = true;
      result.imported.push(table);
      const entry = {
        hash: currentHash,
        lastImported: new Date().toISOString(),
      };
      pending.push([table, entry]);
    }

    const experimentalHash = existsSync(SHIP_EXPERIMENTAL_WEAPONS_PATH)
      ? await getFileHash(SHIP_EXPERIMENTAL_WEAPONS_PATH)
      : null;
    const experimentalChanged =
      experimentalHash != null &&
      experimentalHash !== state.ShipExperimentalWeapons?.hash;

    if (anyImported || forceImport || experimentalChanged) {
      console.log("Resolving relationships...");
      await linkRelations(prisma);
      if (experimentalHash != null) {
        const entry = {
          hash: experimentalHash,
          lastImported: new Date().toISOString(),
        };
        pending.push(["ShipExperimentalWeapons", entry]);
      }
    }

    for (const [table, entry] of pending) {
      state[table] = entry;
      await store.save(table, entry, state);
    }

    console.log(
      `Import summary: ${result.imported.length} imported, ${result.skipped.length} unchanged, ${result.failed.length} failed${
        result.failed.length ? ` (${result.failed.join(", ")})` : ""
      }`,
    );
    return result;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
