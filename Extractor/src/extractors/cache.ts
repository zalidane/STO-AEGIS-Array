import { stat } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * Cargo tables are **not** row-level incremental. When this returns true,
 * extract re-fetches the **entire** Cargo table from STOWiki and overwrites
 * the local JSON. When false, the wiki is not contacted for that table.
 *
 * Images and ShipExperimentalWeapons use separate incremental skip logic.
 */
export const CARGO_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function shouldRefresh(filepath: string): Promise<boolean> {
  if (!existsSync(filepath)) return true;

  const filestat = await stat(filepath);

  if (filestat.size === 0) return true;

  const age = Date.now() - filestat.mtime.getTime();

  return age > CARGO_CACHE_MAX_AGE_MS;
}
