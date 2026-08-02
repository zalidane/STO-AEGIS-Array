import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load DATABASE_URL from the monorepo root `.env`.
 * Uses this file's location so it works from repo root, Extractor/, or packages/database/.
 */
export function loadDatabaseEnv(): void {
  // packages/database/src → ../../../.env = monorepo root
  const fromPackage = resolve(__dirname, "../../../.env");

  const candidates = [
    fromPackage,
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), "../../.env"),
  ];

  for (const candidate of [...new Set(candidates)]) {
    if (existsSync(candidate)) {
      config({ path: candidate, override: false });
    }
  }
}
