import fs from "node:fs/promises";

import type { PrismaClient } from "../generated/prisma/client";
import type { ImportConfig } from "./importConfig";

export async function importTable<
  TRaw extends Record<string, unknown>,
  TMapped extends Record<string, unknown>,
>(prisma: PrismaClient, table: string, config: ImportConfig<TRaw, TMapped>) {
  const file = await fs.readFile(`output/${table}.json`, "utf-8");

  const rows = JSON.parse(file) as TRaw[];

  const model = (prisma as Record<string, any>)[config.model];

  if (!model) {
    throw new Error(`Prisma model '${config.model}' not found`);
  }

  for (const row of rows) {
    const mapped = config.mapper(row);

    const where = buildWhere(mapped, config.uniqueFields);

    await model.upsert({
      where,
      update: mapped,
      create: mapped,
    });
  }

  const count = await model.count();

  console.log(
    `${table}: imported ${rows.length} records (${count} total in database)`,
  );
}

export function buildWhere<TMapped extends Record<string, unknown>>(
  mapped: TMapped,
  uniqueFields: readonly (keyof TMapped)[],
) {
  if (uniqueFields.length === 0) {
    throw new Error("uniqueFields must contain at least one field");
  }

  if (uniqueFields.length === 1) {
    const key = uniqueFields[0]!;
    return { [key]: mapped[key] };
  }

  const compoundName = uniqueFields.join("_");

  return {
    [compoundName]: Object.fromEntries(
      uniqueFields.map((field) => [field, mapped[field]]),
    ),
  };
}
