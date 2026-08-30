import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INFOBOX_BODY_FIELDS,
  INFOBOX_IDENTITY_FIELDS,
  infoboxBodyOnlyWhere,
  infoboxIdentityWhere,
} from "./infoboxSearch.js";

describe("infobox search where", () => {
  it("searches identity fields separately from body copy", () => {
    assert.ok(INFOBOX_IDENTITY_FIELDS.includes("name"));
    assert.ok(INFOBOX_BODY_FIELDS.includes("text1"));
    assert.ok(INFOBOX_BODY_FIELDS.includes("subhead1"));
    assert.equal(
      INFOBOX_IDENTITY_FIELDS.includes("text1" as never),
      false,
    );
  });

  it("limits identity hits to equipment types", () => {
    const where = infoboxIdentityWhere("tetryon");
    assert.equal(where.AND.length, 2);
    assert.deepEqual(where.AND[0], {
      OR: INFOBOX_IDENTITY_FIELDS.map((field) => ({
        [field]: { contains: "tetryon", mode: "insensitive" },
      })),
    });
    const typeFilter = where.AND[1];
    assert.ok(typeFilter && "OR" in typeFilter);
  });

  it("excludes name matches from the body-text query", () => {
    const where = infoboxBodyOnlyWhere("phaser");
    const notName = where.AND[1];
    assert.deepEqual(notName, {
      NOT: { name: { contains: "phaser", mode: "insensitive" } },
    });
    const bodyOr = where.AND[0] as { OR: Array<Record<string, unknown>> };
    assert.ok(
      bodyOr.OR.some((clause) => "text1" in clause),
      "body query should include text1",
    );
  });
});
