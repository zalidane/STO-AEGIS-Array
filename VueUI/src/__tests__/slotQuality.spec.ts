import { describe, expect, it } from "vitest";
import {
  displayedMark,
  displayedQuality,
  inheritModsFromPreviousSameKind,
  modsForNewFill,
  normalizeMark,
  previousSameKindFill,
  qualityColor,
  qualityFromRarity,
  slotUsesItemMods,
} from "@/logic/loadout/slotQuality";
import type { LoadoutSlotFill } from "@/logic/loadout/types";

const slots = [
  { id: "foreWeapon-0", kind: "foreWeapon" as const, index: 0 },
  { id: "foreWeapon-1", kind: "foreWeapon" as const, index: 1 },
  { id: "aftWeapon-0", kind: "aftWeapon" as const, index: 0 },
];

describe("slotQuality", () => {
  it("maps wiki rarity onto a seated quality", () => {
    expect(qualityFromRarity("Epic")).toBe("Epic");
    expect(qualityFromRarity("ultra rare")).toBe("Ultra Rare");
    expect(qualityFromRarity(null)).toBe("Very Rare");
  });

  it("skips quality and mark on starship trait sockets", () => {
    expect(slotUsesItemMods("foreWeapon")).toBe(true);
    expect(slotUsesItemMods("starshipTrait")).toBe(false);
  });

  it("inherits quality, mark, and suffix mods from the previous same-kind fill", () => {
    const fills: LoadoutSlotFill[] = [
      {
        slotId: "foreWeapon-0",
        itemId: 1,
        catalogKind: "item",
        quality: "Epic",
        mark: "Mk XII",
        modifiers: ["[Dmg]", "[CrtH]", "[Pen]"],
      },
    ];
    expect(
      previousSameKindFill(slots, fills, { kind: "foreWeapon", index: 1 })
        ?.itemId,
    ).toBe(1);
    expect(
      inheritModsFromPreviousSameKind(slots, fills, {
        kind: "foreWeapon",
        index: 1,
      }),
    ).toEqual({
      quality: "Epic",
      mark: "Mk XII",
      modifiers: ["[Dmg]", "[CrtH]", "[Pen]"],
    });
    expect(
      inheritModsFromPreviousSameKind(slots, fills, {
        kind: "aftWeapon",
        index: 0,
      }),
    ).toEqual({});
  });

  it("keeps an existing fill's mods when replacing the item", () => {
    expect(
      modsForNewFill({
        kind: "foreWeapon",
        catalogKind: "item",
        existing: { slotId: "foreWeapon-0", itemId: 1, quality: "Rare", mark: "Mk X" },
        inherited: { quality: "Epic", mark: "XV" },
        rarity: "Epic",
      }),
    ).toEqual({ quality: "Rare", mark: "Mk X" });
  });

  it("defaults displayed selectors when a save has no mods", () => {
    expect(displayedQuality({ slotId: "foreWeapon-0", itemId: 1 }, "Epic")).toBe(
      "Epic",
    );
    expect(displayedMark({ slotId: "foreWeapon-0", itemId: 1 })).toBe("XV");
    expect(
      displayedMark(
        { slotId: "universalConsole-0", itemId: 5 },
        "universalConsole",
        "universal console",
      ),
    ).toBe("∞");
  });

  it("defaults universal consoles to infinity mark", () => {
    expect(
      modsForNewFill({
        kind: "universalConsole",
        catalogKind: "item",
        itemType: "universal console",
      }),
    ).toMatchObject({ mark: "∞" });
    expect(
      modsForNewFill({
        kind: "tacticalConsole",
        catalogKind: "item",
        itemType: "universal console",
      }),
    ).toMatchObject({ mark: "∞" });
    expect(
      modsForNewFill({
        kind: "foreWeapon",
        catalogKind: "item",
        itemType: "ship fore weapon",
      }),
    ).toMatchObject({ mark: "XV" });
  });

  it("shows Roman numerals, infinity, and reads older Mk saves", () => {
    expect(normalizeMark("Mk XII")).toBe("XII");
    expect(normalizeMark("XV")).toBe("XV");
    expect(normalizeMark("∞")).toBe("∞");
    expect(normalizeMark("Mk ∞")).toBe("∞");
    expect(normalizeMark("infinity")).toBe("∞");
    expect(qualityColor("Epic")).toBe("#facc15");
    expect(qualityColor("Very Rare")).toBe("#c084fc");
    expect(qualityColor("Ultra Rare")).toBe("#e879f9");
  });
});
