import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { identityKey, planIdentityReplace } from "./identityReplace.js";

describe("planIdentityReplace", () => {
  const fields = ["name", "type"] as const;

  it("keeps ids when name and type still match", () => {
    const plan = planIdentityReplace(
      [
        { id: 10, name: "Phaser Beam Array", type: "Ship Fore Weapon" },
        { id: 11, name: "Tetryon Dual Cannons", type: "Ship Fore Weapon" },
      ],
      [
        { name: "Phaser Beam Array", type: "Ship Fore Weapon", image: "a.png" },
        { name: "Tetryon Dual Cannons", type: "Ship Fore Weapon", image: "b.png" },
      ],
      fields,
    );

    assert.deepEqual(
      plan.update.map((row) => row.id),
      [10, 11],
    );
    assert.deepEqual(plan.create, []);
    assert.deepEqual(plan.deleteIds, []);
  });

  it("creates new rows and deletes removed ones", () => {
    const plan = planIdentityReplace(
      [{ id: 10, name: "Old", type: "Kit" }],
      [{ name: "New", type: "Kit" }],
      fields,
    );

    assert.deepEqual(plan.update, []);
    assert.deepEqual(plan.create, [{ name: "New", type: "Kit" }]);
    assert.deepEqual(plan.deleteIds, [10]);
  });

  it("zips duplicate identity keys in array order", () => {
    const plan = planIdentityReplace(
      [
        { id: 1, name: "Cloaking Device", type: "Universal Console" },
        { id: 2, name: "Cloaking Device", type: "Universal Console" },
      ],
      [
        { name: "Cloaking Device", type: "Universal Console", image: "first" },
        { name: "Cloaking Device", type: "Universal Console", image: "second" },
        { name: "Cloaking Device", type: "Universal Console", image: "third" },
      ],
      fields,
    );

    assert.equal(plan.update[0]?.id, 1);
    assert.equal(plan.update[1]?.id, 2);
    assert.equal(plan.create.length, 1);
    assert.equal(plan.deleteIds.length, 0);
  });

  it("treats null identity fields as empty", () => {
    assert.equal(
      identityKey({ name: "X", type: null }, fields),
      identityKey({ name: "X", type: "" }, fields),
    );
  });
});
