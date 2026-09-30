import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeTraits,
  type TraitCargoRow,
} from "./mergeTraits.js";

const goodDay: TraitCargoRow = {
  name: "A Good Day to Die",
  type: "char",
  environment: "space",
  description: "Go Down Fighting…",
  "short description": null,
  required: null,
  possible: null,
  career: null,
  source: "Sphere Builder Lock Box",
  "char variant": null,
  "boff variant": null,
  "doff variant": null,
  "icon name": null,
  master: "1",
};

const crippling: TraitCargoRow = {
  name: "Crippling Fire",
  type: "char",
  environment: "space",
  description: "Critical hits…",
  "short description": null,
  required: null,
  possible: null,
  career: "tac",
  source: null,
  "char variant": null,
  "boff variant": null,
  "doff variant": null,
  "icon name": null,
  master: "1",
};

describe("mergeTraits", () => {
  it("fills empty career without clobbering wiki career", () => {
    const merged = mergeTraits([goodDay, crippling], [
      {
        name: "A Good Day to Die",
        type: "char",
        environment: "space",
        career: "tac",
      },
      {
        name: "Crippling Fire",
        type: "char",
        environment: "space",
        career: "sci",
        description: "should not win",
      },
    ]);

    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.career, "tac");
    assert.equal(merged[0]?.description, "Go Down Fighting…");
    assert.equal(merged[1]?.career, "tac");
    assert.equal(merged[1]?.description, "Critical hits…");
  });

  it("matches identity on name+type+environment", () => {
    const ground = {
      ...goodDay,
      environment: "ground",
      description: "ground copy",
    };
    const merged = mergeTraits([goodDay, ground], [
      {
        name: "A Good Day to Die",
        type: "char",
        environment: "space",
        career: "tac",
      },
    ]);
    assert.equal(merged[0]?.career, "tac");
    assert.equal(merged[1]?.career, null);
  });

  it("inserts unknown identities as full rows", () => {
    const merged = mergeTraits([], [
      {
        name: "Synthetic Career Trait",
        type: "char",
        environment: "space",
        career: "eng",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.name, "Synthetic Career Trait");
    assert.equal(merged[0]?.career, "eng");
    assert.equal(merged[0]?.master, "1");
  });
});
