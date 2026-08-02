import { stat } from "node:fs/promises";
import { existsSync } from "node:fs";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function shouldRefresh(filepath: string): Promise<boolean> {
  if (!existsSync(filepath)) return true;

  const filestat = await stat(filepath);

  if (filestat.size === 0) return true;

  const age = Date.now() - filestat.mtime.getTime();

  return age > TWENTY_FOUR_HOURS_MS;
}
