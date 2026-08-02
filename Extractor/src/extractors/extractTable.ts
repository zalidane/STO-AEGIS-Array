import { writeFile } from "node:fs/promises";
import { cargoQuery } from "../cargoClient";

export async function extractTable(table: string, fields: string[]) {
  const results: any[] = [];
  const fieldList = fields.join(",");

  let offset = 0;
  const pageSize = 500;

  while (true) {
    console.log(`Loading ${table} (offset: ${offset})`);

    const response = await cargoQuery(table, fieldList, offset, pageSize);

    const rows = response?.cargoquery ?? [];

    if (rows.length === 0) break;

    for (const row of rows) {
      results.push(row.title);
    }

    offset += pageSize;
  }

  await writeFile(`output/${table}.json`, JSON.stringify(results, null, 2));

  console.log(`${table}: saved ${results.length} records`);
}

export async function getFields(table: string): Promise<string[]> {
  const response = await fetch(
    `https://stowiki.net/w/api.php?action=cargofields&table=${table}&format=json`,
  );

  const data = await response.json();

  if (!data?.cargofields) {
    console.error(`Failed loading schema for ${table}`);
    console.error(JSON.stringify(data, null, 2));
    return [];
  }

  return Object.keys(data.cargofields);
}

export async function tryGetFields(table: string): Promise<string[] | null> {
  try {
    return await getFields(table);
  } catch (error) {
    console.warn(`${table}: failed to load schema, assuming Cloudflare block`);
  }

  return null;
}
