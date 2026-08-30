import { describe, expect, it } from "vitest";
import {
  preferredItemIdsForNextSlot,
  rankPickerCandidates,
} from "@/logic/loadout/pickerRank";

const slots = [
  { id: "foreWeapon-0", kind: "foreWeapon", index: 0 },
  { id: "foreWeapon-1", kind: "foreWeapon", index: 1 },
  { id: "foreWeapon-2", kind: "foreWeapon", index: 2 },
  { id: "aftWeapon-0", kind: "aftWeapon", index: 0 },
];

describe("picker rank", () => {
  it("puts the previous same-kind item first for the next slot", () => {
    const preferred = preferredItemIdsForNextSlot(
      slots,
      [
        { slotId: "foreWeapon-0", itemId: 10 },
        { slotId: "aftWeapon-0", itemId: 99 },
      ],
      { kind: "foreWeapon", index: 1 },
    );
    expect(preferred).toEqual([10]);
    expect(
      rankPickerCandidates(
        [{ id: 3 }, { id: 10 }, { id: 8 }],
        preferred,
      ).map((item) => item.id),
    ).toEqual([10, 3, 8]);
  });

  it("prefers the most recently seated same-kind item, then earlier ones", () => {
    expect(
      preferredItemIdsForNextSlot(
        slots,
        [
          { slotId: "foreWeapon-0", itemId: 10 },
          { slotId: "foreWeapon-1", itemId: 11 },
        ],
        { kind: "foreWeapon", index: 2 },
      ),
    ).toEqual([11, 10]);
  });
});
