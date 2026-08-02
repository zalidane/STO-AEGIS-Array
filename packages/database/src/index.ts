import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { installSerializedPoolClients } from "./serializePgClient.js";
import { loadDatabaseEnv } from "./loadEnv.js";

export type { PrismaClient } from "./generated/prisma/client.js";
export * from "./generated/prisma/client.js";

export function createPrismaClient(connectionString?: string) {
  loadDatabaseEnv();

  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Add it to the monorepo root .env (STO-AEGIS-Array/.env).",
    );
  }

  const pool = new Pool({ connectionString: url });
  installSerializedPoolClients(pool);
  const adapter = new PrismaPg(pool);

  return {
    prisma: new PrismaClient({ adapter }),
    pool,
  };
}
