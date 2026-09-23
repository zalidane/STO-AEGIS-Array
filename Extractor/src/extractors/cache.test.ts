import assert from "node:assert/strict";
import { mkdtemp, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { CARGO_CACHE_MAX_AGE_MS, shouldRefresh } from "./cache.js";

describe("shouldRefresh (cargo age gate)", () => {
  it("refreshes missing or empty files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cargo-cache-"));
    assert.equal(await shouldRefresh(join(dir, "missing.json")), true);
    const empty = join(dir, "empty.json");
    await writeFile(empty, "");
    assert.equal(await shouldRefresh(empty), true);
  });

  it("skips files newer than the cargo cache window", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cargo-cache-"));
    const path = join(dir, "Ships.json");
    await writeFile(path, "[]\n");
    const now = new Date();
    await utimes(path, now, now);
    assert.equal(await shouldRefresh(path), false);
  });

  it("refreshes files older than the cargo cache window", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cargo-cache-"));
    const path = join(dir, "Ships.json");
    await writeFile(path, "[]\n");
    const old = new Date(Date.now() - CARGO_CACHE_MAX_AGE_MS - 60_000);
    await utimes(path, old, old);
    assert.equal(await shouldRefresh(path), true);
  });
});
