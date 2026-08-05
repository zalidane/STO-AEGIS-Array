import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Load monorepo env for Prisma CLI (migrate, generate, studio).
 * - Development: `.env`
 * - Production: `.env.production` when NODE_ENV or PRISMA_ENV is "production"
 */
function loadPrismaEnv(): void {
  const useProduction =
    process.env.NODE_ENV === "production" ||
    process.env.PRISMA_ENV === "production";

  const baseNames = useProduction
    ? [".env.production", ".env"]
    : [".env"];

  // Prefer cwd (packages/database) then monorepo root.
  const searchRoots = [process.cwd(), resolve(process.cwd(), "../..")];

  for (const name of baseNames) {
    for (const root of searchRoots) {
      const candidate = resolve(root, name);
      if (!existsSync(candidate)) continue;
      config({
        path: candidate,
        // Production file must win over any previously loaded .env.
        override: useProduction && name === ".env.production",
      });
      return;
    }
  }
}

loadPrismaEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
