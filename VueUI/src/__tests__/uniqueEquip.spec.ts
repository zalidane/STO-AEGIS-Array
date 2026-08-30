import { describe, expect, it } from "vitest";
import {
  copiesAllowed,
  isForcedUniqueItem,
  itemHasOpenCopy,
} from "@/logic/loadout/setBonus";
import type { LoadoutItem, LoadoutSlotFill } from "@/logic/loadout/types";

const uni: LoadoutItem = {
  id: 10,
  name: "Console - Universal - Phase Shift",
  type: "universal console",
  equiplimit: null,
};

const trait: LoadoutItem = {
  id: 20,
  name: "Ablative Shell",
  type: "starship trait",
  catalogKind: "starshipTrait",
  equiplimit: 1,
};

const personal: LoadoutItem = {
  id: 21,
  name: "Beam Barrage",
  type: "personal",
  catalogKind: "trait",
};

const tac: LoadoutItem = {
  id: 30,
  name: "Tactical Console",
  type: "ship tactical console",
  equiplimit: null,
};

describe("unique traits and universal consoles", () => {
  it("treats traits and universal consoles as unique even without wiki equiplimit", () => {
    expect(isForcedUniqueItem(uni)).toBe(true);
    expect(isForcedUniqueItem(trait)).toBe(true);
    expect(isForcedUniqueItem(personal)).toBe(true);
    expect(isForcedUniqueItem(tac)).toBe(false);
    expect(copiesAllowed(uni)).toBe(1);
    expect(copiesAllowed(trait)).toBe(1);
    expect(copiesAllowed(tac)).toBe(Number.POSITIVE_INFINITY);
  });

  it("drops a unique item from remaining copies once it is seated", () => {
    const fills: LoadoutSlotFill[] = [
      { slotId: "universalConsole-0", itemId: 10, catalogKind: "item" },
      { slotId: "starshipTrait-0", itemId: 20, catalogKind: "starshipTrait" },
    ];
    expect(itemHasOpenCopy(uni, fills)).toBe(false);
    expect(itemHasOpenCopy(uni, fills, "universalConsole-0")).toBe(true);
    expect(itemHasOpenCopy(trait, fills)).toBe(false);
    expect(itemHasOpenCopy(tac, fills)).toBe(true);
  });
});
