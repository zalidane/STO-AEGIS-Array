import { describe, expect, it } from "vitest";
import { collectRequestsForSeated } from "@/logic/loadout/collectSeated";

const items = [
  { id: 1, name: "Phaser Dual Cannons", catalogKind: "item" as const, equiplimit: null },
  { id: 2, name: "Unique Torpedo", catalogKind: "item" as const, equiplimit: 1 },
  {
    id: 9,
    name: "Improved Gravity Well",
    catalogKind: "starshipTrait" as const,
    equiplimit: 1,
  },
];

describe("collectRequestsForSeated", () => {
  it("adds one copy per seated stackable item that is not owned", () => {
    expect(
      collectRequestsForSeated({
        fills: [
          { itemId: 1, catalogKind: "item" },
          { itemId: 1, catalogKind: "item" },
          { itemId: 1, catalogKind: "item" },
        ],
        items,
        ownedCount: () => 1,
      }),
    ).toEqual([
      { kind: "item", catalogId: 1, allowDuplicate: true },
      { kind: "item", catalogId: 1, allowDuplicate: true },
    ]);
  });

  it("collects a unique item at most once", () => {
    expect(
      collectRequestsForSeated({
        fills: [
          { itemId: 2, catalogKind: "item" },
          { itemId: 9, catalogKind: "starshipTrait" },
        ],
        items,
        ownedCount: () => 0,
        bindFor: (kind, catalogId) =>
          kind === "item" && catalogId === 2 ? "account" : undefined,
      }),
    ).toEqual([
      { kind: "item", catalogId: 2, bind: "account", allowDuplicate: true },
      { kind: "starshipTrait", catalogId: 9, allowDuplicate: true },
    ]);
  });

  it("returns nothing when every seated copy is already collected", () => {
    expect(
      collectRequestsForSeated({
        fills: [
          { itemId: 1, catalogKind: "item" },
          { itemId: 1, catalogKind: "item" },
        ],
        items,
        ownedCount: () => 2,
      }),
    ).toEqual([]);
  });
});
