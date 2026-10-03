import { describe, expect, it } from "vitest";
import { mergeLogicalPickerItems } from "@/logic/loadout/mergePickerItems";
import { fittingItems } from "@/logic/loadout/pickerCandidates";
import type { LoadoutItem } from "@/logic/loadout/types";

function consoleItem(
  id: number,
  name: string,
  extra: Partial<LoadoutItem> = {},
): LoadoutItem {
  return {
    id,
    name,
    type: "universal console",
    catalogKind: "item",
    rarity: "Epic",
    searchText: "shared effect",
    ...extra,
  };
}

describe("mergeLogicalPickerItems", () => {
  it("merges faction catalog copies of one console into a single row", () => {
    const fed = consoleItem(801, "Console - Universal - Ablative Hazard Shielding");
    const kdf = consoleItem(802, "Console - Universal - Ablative Hazard Shielding");
    const rom = consoleItem(803, "Console - Universal - Ablative Hazard Shielding");
    const other = consoleItem(10, "Console - Universal - Phase Shift", {
      searchText: "phase",
    });
    const merged = mergeLogicalPickerItems([kdf, other, fed, rom]);
    expect(merged.map((item) => item.name)).toEqual([
      "Console - Universal - Ablative Hazard Shielding",
      "Console - Universal - Phase Shift",
    ]);
    expect(merged[0]?.id).toBe(801);
    expect(merged[0]?.mergedIds).toEqual([801, 802, 803]);
  });

  it("prefers an owned catalog id when choosing the row", () => {
    const fed = consoleItem(801, "Console - Universal - Cloaking Device");
    const owned = consoleItem(864, "Console - Universal - Cloaking Device");
    const merged = mergeLogicalPickerItems([fed, owned], new Set(["item:864"]));
    expect(merged.map((item) => item.id)).toEqual([864]);
  });

  it("keeps a different rarity or a different effect as its own row", () => {
    const epic = consoleItem(1022, "Console - Universal - Isometric Charge", {
      rarity: "Epic",
      searchText: "4,281 electrical damage",
    });
    const rare = consoleItem(1023, "Console - Universal - Isometric Charge", {
      rarity: "Rare",
      searchText: "3,031 electrical damage",
    });
    const armor = consoleItem(50, "Console - Tactical - Harmonic Resonance Relay", {
      type: "ship tactical console",
      rarity: "Very Rare",
      searchText: "disruptor damage",
    });
    const penetration = consoleItem(51, "Console - Tactical - Harmonic Resonance Relay", {
      type: "ship tactical console",
      rarity: "Very Rare",
      searchText: "armor penetration",
    });
    expect(
      mergeLogicalPickerItems([epic, rare, armor, penetration]).map(
        (item) => item.id,
      ),
    ).toEqual([1022, 1023, 50, 51]);
  });

  it("folds an empty cargo copy into the one real effect", () => {
    const blank = consoleItem(3313, "Resonant Disruptor Dual Heavy Cannons", {
      type: "ship fore weapon",
      rarity: "Very Rare",
      searchText: "",
    });
    const filled = consoleItem(3314, "Resonant Disruptor Dual Heavy Cannons", {
      type: "ship fore weapon",
      rarity: "Very Rare",
      searchText: "disruptor damage",
    });
    const merged = mergeLogicalPickerItems([blank, filled]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe(3313);
    expect(merged[0]?.searchText).toBe("disruptor damage");
    expect(merged[0]?.mergedIds).toEqual([3313, 3314]);
  });

  it("does not merge traits or bridge officer powers that share a name", () => {
    const base: LoadoutItem = {
      id: 1,
      name: "Improved Going the Extra Mile",
      type: "starship trait",
      catalogKind: "starshipTrait",
    };
    const copy: LoadoutItem = { ...base, id: 2 };
    expect(mergeLogicalPickerItems([base, copy]).map((item) => item.id)).toEqual([
      1, 2,
    ]);
  });
});

describe("fittingItems duplicate rows", () => {
  const cloakA = consoleItem(862, "Console - Universal - Cloaking Device");
  const cloakB = consoleItem(863, "Console - Universal - Cloaking Device");
  const cloakC = consoleItem(864, "Console - Universal - Cloaking Device");

  it("lists a duplicated console once", () => {
    expect(
      fittingItems({
        kind: "universalConsole",
        catalog: [cloakA, cloakB, cloakC],
        seated: [],
        collectedOnly: false,
        ownedKeys: new Set(),
      }).map((item) => item.id),
    ).toEqual([862]);
  });

  it("hides the row when any duplicate copy is already seated", () => {
    expect(
      fittingItems({
        kind: "universalConsole",
        catalog: [cloakA, cloakB, cloakC],
        seated: [
          { slotId: "universalConsole-1", itemId: 864, catalogKind: "item" },
        ],
        collectedOnly: false,
        ownedKeys: new Set(),
        exceptSlotId: "universalConsole-0",
      }),
    ).toEqual([]);
  });

  it("keeps the owned duplicate when only collected items are listed", () => {
    const rows = fittingItems({
      kind: "universalConsole",
      catalog: [cloakA, cloakC],
      seated: [],
      collectedOnly: true,
      ownedKeys: new Set(["item:864"]),
    });
    expect(rows.map((item) => item.id)).toEqual([864]);
  });
});
