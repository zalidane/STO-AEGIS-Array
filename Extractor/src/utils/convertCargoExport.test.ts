import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyInfoboxImageStamps,
  buildInfoboxImageStamps,
  convertCargoExportRow,
  convertCargoExportRows,
  fieldOrderFromCommitted,
  serializeCargoJson,
  stringifyCargoValue,
} from "./convertCargoExport";

describe("stringifyCargoValue", () => {
  it("stringifies numbers and booleans", () => {
    assert.equal(stringifyCargoValue(0), "0");
    assert.equal(stringifyCargoValue(20240725), "20240725");
    assert.equal(stringifyCargoValue(0.18), "0.18");
    assert.equal(stringifyCargoValue(true), "1");
    assert.equal(stringifyCargoValue(false), "0");
    assert.equal(stringifyCargoValue(null), null);
  });

  it("joins list fields on comma, keeping item spacing and trailing empties", () => {
    assert.equal(stringifyCargoValue(["Destroyer"]), "Destroyer");
    assert.equal(stringifyCargoValue([23]), "23");
    assert.equal(stringifyCargoValue(["3000;Zen"]), "3000;Zen");
    assert.equal(
      stringifyCargoValue(["Herald Tactical Kit", " Herald Science Kit", "Herald Engineering Kit"]),
      "Herald Tactical Kit, Herald Science Kit,Herald Engineering Kit",
    );
    assert.equal(stringifyCargoValue(["Vulcan", ""]), "Vulcan,");
  });

  it("treats empty lists as null", () => {
    assert.equal(stringifyCargoValue([]), null);
    assert.equal(stringifyCargoValue([""]), null);
    assert.equal(stringifyCargoValue([null, ""]), null);
  });
});

describe("convertCargoExportRow", () => {
  it("renames spaced Cargo fields, drops _pageName, and applies field order", () => {
    const row = convertCargoExportRow(
      {
        _pageName: "Sniper (starship trait)",
        name: "Sniper",
        icon_name: "Sniper (starship)",
        short: "ok",
        tag: null,
      },
      ["name", "short", "icon name", "tag"],
    );
    assert.deepEqual(row, {
      name: "Sniper",
      short: "ok",
      "icon name": "Sniper (starship)",
      tag: null,
    });
    assert.equal(JSON.stringify(Object.keys(row)), JSON.stringify(["name", "short", "icon name", "tag"]));
    assert.equal(Object.prototype.hasOwnProperty.call(row, "_pageName"), false);
  });

  it("preserves Infobox image stamps by name and type", () => {
    const stamps = buildInfoboxImageStamps([
      { name: "Phaser Rifle", type: "Ground Weapon", image: "Phaser_Rifle_icon.png" },
    ]);
    const rows = applyInfoboxImageStamps(
      [
        { name: "Phaser Rifle", type: "Ground Weapon", text1: "pew" },
        { name: "New Console", type: "Universal Console", text1: "new" },
      ],
      stamps,
    );
    assert.equal(rows[0]?.image, "Phaser_Rifle_icon.png");
    assert.equal(rows[1]?.image, null);
  });
});

describe("serializeCargoJson", () => {
  it("matches extractTable formatting: 2-space indent, no trailing newline", () => {
    const rows = convertCargoExportRows(
      [{ cat: "Lock Box", type: "Phaser", flavor: "Phaser", box: "Box", lb: null, rep: null }],
      fieldOrderFromCommitted([{ cat: "x", type: "y", flavor: "z", box: "b", lb: null, rep: null }]),
    );
    const serialized = serializeCargoJson(rows);
    assert.equal(
      serialized,
      `[
  {
    "cat": "Lock Box",
    "type": "Phaser",
    "flavor": "Phaser",
    "box": "Box",
    "lb": null,
    "rep": null
  }
]`,
    );
    assert.equal(serialized.endsWith("\n"), false);
  });
});
