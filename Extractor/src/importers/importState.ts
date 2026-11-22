import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const STATE_FILE = "output/importState.json";

export interface ImportStateEntry {
  hash: string;
  lastImported: string;
}

export type ImportStateMap = Record<string, ImportStateEntry>;

/**
 * Where importAll remembers the hash it last imported per table.
 * - `file`: `output/importState.json` (local runs; gitignored)
 * - `db`: the `ImportState` table, for Railway pre-deploy runs whose
 *   container filesystem is thrown away after every deploy
 */
export interface ImportStateStore {
  readonly kind: "file" | "db";
  load(): Promise<ImportStateMap>;
  /** Persist one table's entry (called after that table imports). */
  save(table: string, entry: ImportStateEntry, all: ImportStateMap): Promise<void>;
}

export async function loadState(): Promise<ImportStateMap> {
  if (!existsSync(STATE_FILE)) {
    return {};
  }

  const content = await readFile(STATE_FILE, "utf-8");

  return JSON.parse(content);
}

export async function saveState(state: ImportStateMap) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export const fileStateStore: ImportStateStore = {
  kind: "file",
  load: loadState,
  async save(_table, _entry, all) {
    await saveState(all);
  },
};

/** Minimal slice of the Prisma `importState` delegate this store uses. */
export interface ImportStateDelegate {
  findMany(args?: unknown): Promise<
    { table: string; hash: string; lastImported: Date }[]
  >;
  upsert(args: {
    where: { table: string };
    update: { hash: string; lastImported: Date };
    create: { table: string; hash: string; lastImported: Date };
  }): Promise<unknown>;
}

export function dbStateStore(model: ImportStateDelegate): ImportStateStore {
  return {
    kind: "db",
    async load() {
      const rows = await model.findMany();
      const state: ImportStateMap = {};
      for (const row of rows) {
        state[row.table] = {
          hash: row.hash,
          lastImported: row.lastImported.toISOString(),
        };
      }
      return state;
    },
    async save(table, entry) {
      const lastImported = new Date(entry.lastImported);
      await model.upsert({
        where: { table },
        update: { hash: entry.hash, lastImported },
        create: { table, hash: entry.hash, lastImported },
      });
    },
  };
}
