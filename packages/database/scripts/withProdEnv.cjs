/**
 * Run a Prisma CLI command with PRISMA_ENV=production so prisma.config.ts
 * and runtime env loaders pick up the monorepo `.env.production`.
 *
 * Usage: node scripts/withProdEnv.cjs migrate deploy
 */
process.env.PRISMA_ENV = "production";
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/withProdEnv.cjs <prisma-args…>");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: resolve(__dirname, ".."),
});

process.exit(result.status ?? 1);
