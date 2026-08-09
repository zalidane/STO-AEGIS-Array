import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities";

describe("encoded-name dedupe grouping", () => {
  it("groups Mat&#039;Ha and Mat'Ha under one decoded key", () => {
    const names = ["Mat&#039;Ha Raptor", "Mat'Ha Raptor", "Fleet Mat&#039;Ha Raptor"];
    const groups = new Map<string, string[]>();
    for (const name of names) {
      const key = decodeHtmlEntities(name);
      const list = groups.get(key) ?? [];
      list.push(name);
      groups.set(key, list);
    }

    assert.equal(groups.get("Mat'Ha Raptor")?.length, 2);
    assert.equal(groups.get("Fleet Mat'Ha Raptor")?.length, 1);
  });
});
