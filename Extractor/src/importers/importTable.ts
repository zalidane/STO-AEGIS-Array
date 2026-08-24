import fs from "node:fs/promises";

import type { PrismaClient } from "@sto-aegis/database";
import type { ImportConfig } from "./importConfig.js";
import { validateCargoJson } from "../utils/validateCargoJson.js";

export async function importTable<
  TRaw extends Record<string, unknown>,
  TMapped extends Record<string, unknown>,
>(
  prisma: PrismaClient,
  table: string,
  config: ImportConfig<TRaw, TMapped>,
): Promise<boolean> {
  const file = await fs.readFile(`output/${table}.json`, "utf-8");
  const validation = validateCargoJson(file, `${table} import`);

  if (!validation.ok) {
    console.error(`[JSON] ${table}: import skipped due to invalid JSON`);
    return false;
  }

  const rows = validation.rows as TRaw[];
  const model = (prisma as unknown as Record<string, any>)[config.model];

  if (!model) {
    console.error(
      `${table}: Prisma model '${config.model}' not found — import skipped`,
    );
    return false;
  }

  const strategy =
    config.strategy ?? (config.uniqueFields?.length ? "upsert" : "replace");

  if (strategy === "replace") {
    await replaceAll(model, rows, config.mapper);
  } else {
    if (!config.uniqueFields?.length) {
      console.error(
        `${table}: upsert strategy requires uniqueFields — import skipped`,
      );
      return false;
    }
    await upsertAll(model, rows, config.mapper, config.uniqueFields);
  }

  const count = await model.count();

  if (count !== rows.length) {
    console.warn(
      `${table}: JSON has ${rows.length} rows but database has ${count} after import`,
    );
  }

  console.log(
    `${table}: imported ${rows.length} records (${count} total in database)`,
  );

  return true;
}

async function upsertAll<
  TRaw extends Record<string, unknown>,
  TMapped extends Record<string, unknown>,
>(
  model: any,
  rows: TRaw[],
  mapper: (row: TRaw) => TMapped,
  uniqueFields: readonly (keyof TMapped)[],
) {
  for (const row of rows) {
    const mapped = mapper(row);
    const where = buildWhere(mapped, uniqueFields);

    await model.upsert({
      where,
      update: mapped,
      create: mapped,
    });
  }
}

async function replaceAll<
  TRaw extends Record<string, unknown>,
  TMapped extends Record<string, unknown>,
>(model: any, rows: TRaw[], mapper: (row: TRaw) => TMapped) {
  await model.deleteMany();
  if (rows.length === 0) return;

  await model.createMany({
    data: rows.map((row) => mapper(row)),
  });
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
