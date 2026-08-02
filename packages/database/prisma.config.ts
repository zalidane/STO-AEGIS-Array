import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
]) {
  if (existsSync(candidate)) {
    config({ path: candidate });
    break;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
