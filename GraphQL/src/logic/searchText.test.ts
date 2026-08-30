import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeUniqueById, orTextFields } from "./searchText.js";

describe("search text helpers", () => {
  it("builds case-insensitive contains filters for each field", () => {
    assert.deepEqual(orTextFields("phaser", ["name", "text1"]), {
      OR: [
        { name: { contains: "phaser", mode: "insensitive" } },
        { text1: { contains: "phaser", mode: "insensitive" } },
      ],
    });
  });

  it("keeps primary hits first and drops duplicate ids", () => {
    const merged = mergeUniqueById(
      [
        { id: 2, name: "Phaser Beam Array" },
        { id: 3, name: "Phaser Dual Cannons" },
      ],
      [
        { id: 3, name: "Phaser Dual Cannons" },
        { id: 1, name: "Console - Universal - D.O.M.I.N.O." },
      ],
    );
    assert.deepEqual(
      merged.map((row) => row.id),
      [2, 3, 1],
    );
  });
});
