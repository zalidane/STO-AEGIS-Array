import { describe, expect, it } from "vitest";
import {
  applyBoardPrefsToHullSlots,
  compactBoardPrefs,
  hullUpgradeChoices,
  mergeBoardPrefs,
  sanitizeBoardPrefs,
  unlockedExtraRuleIds,
} from "@/logic/loadout/boardPrefs";
import { buildHullSlots } from "@/logic/loadout/hullSlots";
import { buildCaptainTraitSlots } from "@/logic/loadout/captainTraits";

const t6Miracle = {
  tier: 6,
  boffs: "Commander Engineering-Miracle Worker",
  devices: 2,
  tacticalSlots: 4,
  engineeringSlots: 3,
  scienceSlots: 2,
  foreWeapons: 4,
  aftWeapons: 3,
};

const t5Tac = {
  tier: 5,
  t5uConsole: "tac",
  devices: 2,
  tacticalSlots: 4,
  engineeringSlots: 3,
  scienceSlots: 2,
  foreWeapons: 4,
  aftWeapons: 3,
};

describe("boardPrefs", () => {
  it("treats missing prefs as fully upgraded", () => {
    expect([...unlockedExtraRuleIds(t6Miracle, undefined)].sort()).toEqual([
      "commander-miracle-worker",
      "t6-x",
      "t6-x2",
    ]);
    expect(compactBoardPrefs(undefined)).toBeUndefined();
    expect(sanitizeBoardPrefs({ hullUpgrade: "nope", hideModifiers: true })).toEqual(
      { hideModifiers: true },
    );
  });

  it("lists nested T6 and T5 upgrade choices", () => {
    expect(hullUpgradeChoices(t6Miracle).map((row) => row.value)).toEqual([
      "full",
      "x",
      "stock",
    ]);
    expect(hullUpgradeChoices(t5Tac).map((row) => row.value)).toEqual([
      "full",
      "x",
      "u",
      "stock",
    ]);
  });

  it("hides T6-X / T6-X2 sockets on a stock hull without dropping other gear", () => {
    const full = buildHullSlots(t6Miracle);
    const stock = applyBoardPrefsToHullSlots(
      full,
      { hullUpgrade: "stock" },
      t6Miracle,
    );
    expect(full.some((slot) => slot.label.includes("T6-X2"))).toBe(true);
    expect(stock.some((slot) => slot.label.includes("T6-X"))).toBe(false);
    expect(stock.filter((slot) => slot.kind === "device")).toHaveLength(2);
    expect(stock.filter((slot) => slot.kind === "universalConsole")).toHaveLength(
      1,
    );
    expect(stock.find((slot) => slot.kind === "universalConsole")?.label).toBe(
      "Universal (Miracle Worker)",
    );
    expect(
      buildCaptainTraitSlots({
        hullTraitSlots: stock.filter((slot) => slot.kind === "starshipTrait"),
      }).filter((slot) => slot.group === "shipSpecific"),
    ).toHaveLength(0);
  });

  it("locks unused extras instead of hiding them", () => {
    const locked = applyBoardPrefsToHullSlots(
      buildHullSlots(t6Miracle),
      { hullUpgrade: "x", extraSlotDisplay: "lock" },
      t6Miracle,
    );
    const x2 = locked.find((slot) => slot.label === "Universal (T6-X2)");
    const x = locked.find((slot) => slot.label === "Universal (T6-X)");
    expect(x?.locked).toBeUndefined();
    expect(x2?.locked).toBe(true);
  });

  it("can hide the Miracle Worker console independently", () => {
    const slots = applyBoardPrefsToHullSlots(
      buildHullSlots(t6Miracle),
      { miracleWorkerConsole: false },
      t6Miracle,
    );
    expect(slots.some((slot) => slot.label.includes("Miracle Worker"))).toBe(
      false,
    );
    expect(slots.filter((slot) => slot.kind === "universalConsole")).toHaveLength(
      2,
    );
  });

  it("keeps T5-U when the hull is at the T5-X step", () => {
    const slots = applyBoardPrefsToHullSlots(
      buildHullSlots(t5Tac),
      { hullUpgrade: "x" },
      t5Tac,
    );
    expect(slots.some((slot) => slot.label === "Tactical (T5-U)")).toBe(true);
    expect(slots.some((slot) => slot.label === "Universal (T5-X)")).toBe(true);
    expect(slots.some((slot) => slot.label === "Universal (T5-X2)")).toBe(false);
  });

  it("omits default prefs from the persisted object", () => {
    expect(
      mergeBoardPrefs({ hideModifiers: true }, { hideModifiers: false }),
    ).toBeUndefined();
    expect(mergeBoardPrefs(undefined, { hullUpgrade: "stock" })).toEqual({
      hullUpgrade: "stock",
    });
  });
});
