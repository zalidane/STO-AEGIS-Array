import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load DATABASE_URL from the monorepo root.
 * Uses this file's location so it works from repo root, Extractor/, or packages/database/.
 *
 * Resolution order:
 * - production (NODE_ENV or PRISMA_ENV): `.env.production`, then `.env`
 * - otherwise: `.env`, then `.env.production` (no override)
 */
export function loadDatabaseEnv(): void {
  // Platform-injected vars (Railway, etc.) take precedence — do not overwrite.
  if (process.env.DATABASE_URL) {
    return;
  }

  const useProduction =
    process.env.NODE_ENV === "production" ||
    process.env.PRISMA_ENV === "production";

  // packages/database/src → ../../../ = monorepo root
  const monorepoRoot = resolve(__dirname, "../../..");

  const searchRoots = [
    monorepoRoot,
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
  ];

  const fileNames = useProduction
    ? [".env.production", ".env"]
    : [".env"];

  for (const name of fileNames) {
    for (const root of [...new Set(searchRoots)]) {
      const candidate = resolve(root, name);
      if (!existsSync(candidate)) continue;
      config({
        path: candidate,
        override: useProduction && name === ".env.production",
      });
      if (useProduction && name === ".env.production") return;
      // For non-production, load the first .env found and stop.
      if (!useProduction) return;
    }
  }
}
