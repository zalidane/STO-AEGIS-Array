import { test } from "node:test";
import assert from "node:assert/strict";

import { dbStateStore, type ImportStateDelegate } from "./importState.js";

function fakeDelegate() {
  const rows = new Map<string, { table: string; hash: string; lastImported: Date }>();
  const delegate: ImportStateDelegate = {
    async findMany() {
      return [...rows.values()];
    },
    async upsert({ where, update, create }) {
      const existing = rows.get(where.table);
      rows.set(where.table, existing ? { ...existing, ...update } : { ...create });
      return rows.get(where.table);
    },
  };
  return { rows, delegate };
}

test("dbStateStore loads an empty table as no state", async () => {
  const { delegate } = fakeDelegate();
  assert.deepEqual(await dbStateStore(delegate).load(), {});
});

test("dbStateStore round-trips hashes and updates in place", async () => {
  const { rows, delegate } = fakeDelegate();
  const store = dbStateStore(delegate);

  await store.save("Traits", { hash: "a", lastImported: "2026-11-21T10:00:00.000Z" }, {});
  await store.save("Traits", { hash: "b", lastImported: "2026-11-22T10:00:00.000Z" }, {});
  await store.save("Ships", { hash: "s", lastImported: "2026-11-22T10:00:00.000Z" }, {});

  assert.equal(rows.size, 2);
  assert.deepEqual(await store.load(), {
    Traits: { hash: "b", lastImported: "2026-11-22T10:00:00.000Z" },
    Ships: { hash: "s", lastImported: "2026-11-22T10:00:00.000Z" },
  });
});
