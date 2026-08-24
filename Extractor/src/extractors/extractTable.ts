import { writeFile } from "node:fs/promises";
import type { WikiClient } from "../wiki/client";

export async function extractTable(
  wiki: WikiClient,
  table: string,
  fields: string[],
) {
  const results: unknown[] = [];
  const fieldList = fields.join(",");

  let offset = 0;
  const pageSize = 500;

  while (true) {
    console.log(`Loading ${table} (offset: ${offset})`);

    const response = await wiki.cargoQuery(table, fieldList, offset, pageSize);
    const rows = Array.isArray(response.cargoquery) ? response.cargoquery : [];

    if (rows.length === 0) break;

    for (const row of rows) {
      if (row && typeof row === "object" && "title" in row) {
        results.push((row as { title: unknown }).title);
      }
    }

    offset += pageSize;
  }

  await writeFile(`output/${table}.json`, JSON.stringify(results, null, 2));

  console.log(`${table}: saved ${results.length} records`);
}

export async function getFields(wiki: WikiClient, table: string): Promise<string[]> {
  return wiki.cargoFields(table);
}

export async function tryGetFields(
  wiki: WikiClient,
  table: string,
): Promise<string[] | null> {
  try {
    return await getFields(wiki, table);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${table}: failed to load schema (${message})`);
  }

  return null;
}
