import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeModifiers,
  unionCommaList,
  type ModifierCargoRow,
} from "./mergeModifiers.js";

const hullHeal: ModifierCargoRow = {
  modifier: "[HullHeal]",
  stats: "+__ Starship Hull Restoration",
  type: "Ship Deflector Dish",
  available:
    "Advanced Graviton Deflector Array,Advanced Neutrino Deflector Array",
  isunique: "1",
  isepic: "0",
  info: null,
};

const proc: ModifierCargoRow = {
  modifier: "[Proc]",
  stats: null,
  type: "Ship Weapon,Ship Aft Weapon",
  available: null,
  isunique: "1",
  isepic: "0",
  info: null,
};

describe("unionCommaList", () => {
  it("unions and dedupes case-insensitively", () => {
    assert.equal(
      unionCommaList("Ship Weapon,Ship Aft Weapon", "ship weapon,Ship Fore Weapon"),
      "Ship Weapon,Ship Aft Weapon,Ship Fore Weapon",
    );
  });

  it("returns null for empty inputs", () => {
    assert.equal(unionCommaList(null, ""), null);
  });
});

describe("mergeModifiers", () => {
  it("inserts missing tokens as full rows", () => {
    const merged = mergeModifiers([], [
      {
        modifier: "[HullCap]",
        stats: "+__ Starship Hull Capacity",
        type: "Ship Deflector Dish,Ship Secondary Deflector",
        available: null,
        isunique: "1",
        isepic: "0",
        info: "supplement",
      },
    ]);

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.modifier, "[HullCap]");
    assert.equal(merged[0]?.stats, "+__ Starship Hull Capacity");
    assert.equal(
      merged[0]?.type,
      "Ship Deflector Dish,Ship Secondary Deflector",
    );
  });

  it("widens type on a unique existing modifier without clobbering stats", () => {
    const merged = mergeModifiers([proc], [
      {
        modifier: "[Proc]",
        type: "Ship Weapon,Ship Fore Weapon",
        stats: "should not win",
        isunique: "0",
        isepic: "1",
      },
    ]);

    assert.equal(merged.length, 1);
    assert.equal(
      merged[0]?.type,
      "Ship Weapon,Ship Aft Weapon,Ship Fore Weapon",
    );
    assert.equal(merged[0]?.stats, null);
    assert.equal(merged[0]?.isunique, "1");
    assert.equal(merged[0]?.isepic, "0");
  });

  it("clears available when clearAvailable is set", () => {
    const merged = mergeModifiers([hullHeal], [
      {
        modifier: "[HullHeal]",
        type: "Ship Deflector Dish",
        _merge: { clearAvailable: true },
      },
    ]);

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.available, null);
    assert.equal(merged[0]?.stats, "+__ Starship Hull Restoration");
  });

  it("widens available by union when not clearing", () => {
    const merged = mergeModifiers([hullHeal], [
      {
        modifier: "[HullHeal]",
        type: "Ship Deflector Dish",
        available: "Non-Baryonic Matter Deflector,advanced graviton deflector array",
      },
    ]);

    assert.equal(
      merged[0]?.available,
      "Advanced Graviton Deflector Array,Advanced Neutrino Deflector Array,Non-Baryonic Matter Deflector",
    );
  });

  it("matches multi-row modifiers by exact type or matchType", () => {
    const accWeapon: ModifierCargoRow = {
      modifier: "[Acc]",
      stats: "+Accuracy",
      type: "Ship Weapon,Ship Fore Weapon",
      available: null,
      isunique: "0",
      isepic: "0",
      info: null,
    };
    const accDeflector: ModifierCargoRow = {
      modifier: "[Acc]",
      stats: "+Accuracy deflector",
      type: "Ship Secondary Deflector",
      available: null,
      isunique: "0",
      isepic: "0",
      info: null,
    };

    const byExact = mergeModifiers([accWeapon, accDeflector], [
      {
        modifier: "[Acc]",
        type: "Ship Secondary Deflector",
        available: "Only This",
      },
    ]);
    assert.equal(byExact[0]?.available, null);
    assert.equal(byExact[1]?.available, "Only This");

    const byMatch = mergeModifiers([accWeapon, accDeflector], [
      {
        modifier: "[Acc]",
        type: "Ship Weapon,Ship Fore Weapon,Ship Aft Weapon",
        _merge: { matchType: "Ship Weapon,Ship Fore Weapon" },
      },
    ]);
    assert.equal(
      byMatch[0]?.type,
      "Ship Weapon,Ship Fore Weapon,Ship Aft Weapon",
    );
    assert.equal(byMatch[1]?.type, "Ship Secondary Deflector");
  });

  it("inserts when multi-row modifier has no exact match", () => {
    const accWeapon: ModifierCargoRow = {
      modifier: "[Acc]",
      stats: "+Accuracy",
      type: "Ship Weapon,Ship Fore Weapon",
      available: null,
      isunique: "0",
      isepic: "0",
      info: null,
    };
    const accDeflector: ModifierCargoRow = {
      modifier: "[Acc]",
      stats: "+Accuracy deflector",
      type: "Ship Secondary Deflector",
      available: null,
      isunique: "0",
      isepic: "0",
      info: null,
    };

    const merged = mergeModifiers([accWeapon, accDeflector], [
      {
        modifier: "[Acc]",
        stats: "+kit",
        type: "Kit",
        available: null,
        isunique: "0",
        isepic: "0",
        info: null,
      },
    ]);

    assert.equal(merged.length, 3);
    assert.equal(merged[2]?.type, "Kit");
  });

  it("strips _merge from inserted rows", () => {
    const merged = mergeModifiers([], [
      {
        modifier: "[ShCap]",
        stats: "+__ Starship Shield Capacity",
        type: "Ship Deflector Dish",
        available: null,
        isunique: "1",
        isepic: "0",
        info: null,
        _merge: { clearAvailable: true },
      },
    ]);

    assert.equal("_merge" in merged[0]!, false);
  });

  it("widens [Proc] to include Ship Fore Weapon (#10)", () => {
    const cargoProc: ModifierCargoRow = {
      modifier: "[Proc]",
      stats: null,
      type: "Body Armor,EV Suit,Ground Weapon,Kit,Personal Shield,Ship Aft Weapon,Ship Weapon",
      available: null,
      isunique: "1",
      isepic: "0",
      info: null,
    };

    const merged = mergeModifiers([cargoProc], [
      {
        modifier: "[Proc]",
        type: "Body Armor,EV Suit,Ground Weapon,Kit,Personal Shield,Ship Aft Weapon,Ship Weapon,Ship Fore Weapon",
        available: null,
        isunique: "1",
        isepic: "0",
        info: "supplement",
      },
    ]);

    assert.equal(merged.length, 1);
    assert.match(merged[0]!.type, /Ship Fore Weapon/);
    assert.match(merged[0]!.type, /Ship Weapon/);
    assert.equal(merged[0]!.available, null);
    assert.equal(merged[0]!.info, null);
  });
});
