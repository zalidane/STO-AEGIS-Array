import fs from "node:fs/promises";

export async function importTable(
  prisma: any,
  table: string,
  modelName: string,
) {
  const file = await fs.readFile(`output/${table}.json`, "utf-8");

  const rows = JSON.parse(file);

  const model = prisma[modelName];

  for (const row of rows) {
    const name = row.name ?? row.Name;

    if (!name) {
      continue;
    }

    await model.upsert({
      where: { name },
      update: {
        rawData: row,
      },
      create: {
        name,
        rawData: row,
      },
    });
  }

  const count = await model.count();

  console.log(
    `${table}: imported ${rows.length} records (${count} total in database)`,
  );
}
