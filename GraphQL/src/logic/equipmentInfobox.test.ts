import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  equipmentInfoboxTypeWhere,
  isEquipmentInfoboxType,
} from "./equipmentInfobox.js";

describe("equipment infobox search filter", () => {
  it("accepts catalog equipment types regardless of case", () => {
    assert.equal(isEquipmentInfoboxType("Universal Console"), true);
    assert.equal(isEquipmentInfoboxType("warp engine"), true);
    assert.equal(isEquipmentInfoboxType("Duty Officer"), false);
    assert.equal(isEquipmentInfoboxType(null), false);
  });

  it("builds an insensitive type filter for Prisma", () => {
    const where = equipmentInfoboxTypeWhere();
    assert.ok(where.OR.length > 0);
    assert.deepEqual(where.OR[0], {
      type: { equals: "universal console", mode: "insensitive" },
    });
  });
});
