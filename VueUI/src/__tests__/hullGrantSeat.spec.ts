import { describe, expect, it } from "vitest";
import { pendingHullGrantEquips } from "@/logic/loadout/hullGrantSeat";
import type { HullSlot } from "@/logic/loadout/hullSlots";
import type { LoadoutItem } from "@/logic/loadout/types";

const uni: LoadoutItem = {
  id: 88,
  name: "Console - Universal - Phase Shift",
  type: "universal console",
  catalogKind: "item",
};

const experimental: LoadoutItem = {
  id: 99,
  name: "Experimental Hyperexcited Ion Stream Projector",
  type: "ship experimental weapon",
  catalogKind: "item",
};

const hull: HullSlot[] = [
  {
    id: "universalConsole-0",
    kind: "universalConsole",
    group: "universalConsoles",
    label: "Universal",
    index: 0,
  },
  {
    id: "scienceConsole-0",
    kind: "scienceConsole",
    group: "scienceConsoles",
    label: "Science",
    index: 0,
  },
  {
    id: "experimental",
    kind: "experimental",
    group: "experimental",
    label: "Experimental",
    index: 0,
  },
];

describe("pendingHullGrantEquips", () => {
  it("queues unique console and experimental weapon seats", () => {
    const result = pendingHullGrantEquips({
      ship: {
        uniconsoleId: 88,
        experimentalWeaponId: 99,
      },
      hullSlots: hull,
      loadout: { slots: [] },
      catalog: [uni, experimental],
    });
    expect(result.waiting).toBe(false);
    expect(result.equips).toEqual([
      { slotId: "universalConsole-0", itemId: 88 },
      { slotId: "experimental", itemId: 99 },
    ]);
  });

  it("skips grants that are already seated", () => {
    const result = pendingHullGrantEquips({
      ship: { uniconsoleId: 88, experimentalWeaponId: 99 },
      hullSlots: hull,
      loadout: {
        slots: [
          { slotId: "universalConsole-0", itemId: 88 },
          { slotId: "experimental", itemId: 99 },
        ],
      },
      catalog: [uni, experimental],
    });
    expect(result).toEqual({ equips: [], waiting: false });
  });

  it("waits when the catalog has not loaded the grant yet", () => {
    const result = pendingHullGrantEquips({
      ship: { uniConsole: { id: 88 } },
      hullSlots: hull,
      loadout: { slots: [] },
      catalog: [],
    });
    expect(result.waiting).toBe(true);
    expect(result.equips).toEqual([]);
  });

  it("prefers a fitting console slot from the granted item type", () => {
    const scienceUni: LoadoutItem = {
      ...uni,
      type: "ship science console",
    };
    const result = pendingHullGrantEquips({
      ship: { uniconsoleId: 88 },
      hullSlots: hull,
      loadout: { slots: [] },
      catalog: [scienceUni],
    });
    expect(result.equips).toEqual([{ slotId: "scienceConsole-0", itemId: 88 }]);
  });
});
