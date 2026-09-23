import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  ONE_MONTH_MS,
  formatAge,
  isExtractDue,
  parseLastExtractState,
  resolveLastExtractAt,
  writeLastExtractState,
} from "./homeExtractSchedule.js";

describe("isExtractDue", () => {
  const now = new Date("2026-09-23T12:00:00.000Z");

  it("is due when there is no prior timestamp", () => {
    const decision = isExtractDue(null, now);
    assert.equal(decision.due, true);
    assert.match(decision.reason, /no prior/);
  });

  it("is due when last extract is older than one month", () => {
    const last = new Date(now.getTime() - ONE_MONTH_MS - 1000);
    const decision = isExtractDue(last, now);
    assert.equal(decision.due, true);
    assert.ok((decision.ageMs ?? 0) > ONE_MONTH_MS);
  });

  it("is not due when last extract is within one month", () => {
    const last = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const decision = isExtractDue(last, now);
    assert.equal(decision.due, false);
    assert.match(decision.reason, /threshold/);
  });

  it("treats invalid dates as due", () => {
    assert.equal(isExtractDue(new Date("not-a-date"), now).due, true);
  });
});

describe("parseLastExtractState", () => {
  it("accepts ISO timestamps", () => {
    const parsed = parseLastExtractState({
      lastExtractAt: "2026-08-01T00:00:00.000Z",
      source: "extract",
    });
    assert.deepEqual(parsed, {
      lastExtractAt: "2026-08-01T00:00:00.000Z",
      source: "extract",
    });
  });

  it("rejects missing or invalid payloads", () => {
    assert.equal(parseLastExtractState(null), null);
    assert.equal(parseLastExtractState({}), null);
    assert.equal(parseLastExtractState({ lastExtractAt: "bogus" }), null);
  });
});

describe("resolveLastExtractAt", () => {
  it("prefers last-extract.json over cargo mtimes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "home-extract-"));
    await writeFile(join(dir, "Ships.json"), "[]\n");
    const stamped = await writeLastExtractState(
      dir,
      new Date("2026-01-15T00:00:00.000Z"),
      "test",
    );
    const resolved = await resolveLastExtractAt(dir);
    assert.equal(resolved?.toISOString(), stamped.lastExtractAt);
  });

  it("falls back to newest cargo JSON mtime", async () => {
    const dir = await mkdtemp(join(tmpdir(), "home-extract-"));
    await mkdir(dir, { recursive: true });
    const ships = join(dir, "Ships.json");
    const traits = join(dir, "Traits.json");
    await writeFile(ships, "[]\n");
    await writeFile(traits, "[]\n");
    const older = new Date("2026-07-01T00:00:00.000Z");
    const newer = new Date("2026-08-15T00:00:00.000Z");
    await utimes(ships, older, older);
    await utimes(traits, newer, newer);
    const resolved = await resolveLastExtractAt(dir);
    assert.equal(resolved?.toISOString(), newer.toISOString());
  });
});

describe("formatAge", () => {
  it("formats days and hours", () => {
    assert.equal(formatAge(2 * 24 * 60 * 60 * 1000), "2d");
    assert.equal(formatAge(5 * 60 * 60 * 1000), "5h");
  });
});
