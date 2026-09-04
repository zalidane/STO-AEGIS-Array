/**
 * Match incoming cargo rows to existing DB rows by identity fields so a
 * replace import can update in place instead of deleting and reallocating ids.
 * Duplicate keys zip in array order.
 */
export function identityKey(
  row: Record<string, unknown>,
  fields: readonly string[],
): string {
  return fields.map((field) => String(row[field] ?? "")).join("\0");
}

export type IdentityReplacePlan<T> = {
  update: Array<{ id: number; data: T }>;
  create: T[];
  deleteIds: number[];
};

export function planIdentityReplace<T extends Record<string, unknown>>(
  existing: ReadonlyArray<{ id: number } & Record<string, unknown>>,
  incoming: readonly T[],
  identityFields: readonly string[],
): IdentityReplacePlan<T> {
  const queues = new Map<string, number[]>();
  for (const row of existing) {
    const key = identityKey(row, identityFields);
    const list = queues.get(key);
    if (list) list.push(row.id);
    else queues.set(key, [row.id]);
  }

  const update: Array<{ id: number; data: T }> = [];
  const create: T[] = [];
  const used = new Set<number>();

  for (const data of incoming) {
    const key = identityKey(data, identityFields);
    const id = queues.get(key)?.shift();
    if (id == null) {
      create.push(data);
      continue;
    }
    used.add(id);
    update.push({ id, data });
  }

  return {
    update,
    create,
    deleteIds: existing
      .filter((row) => !used.has(row.id))
      .map((row) => row.id),
  };
}
