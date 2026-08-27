import { describe, expect, it } from "vitest";
import { createCharacter } from "@/logic/collection/state";
import { hydrateCollectionState } from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
  type CollectionState,
} from "@/logic/collection/types";
import { buildHullSlots, groupHullSlots } from "@/logic/loadout/hullSlots";
import {
  applyLoadout,
  createLoadout,
  deleteLoadout,
  equipLoadoutSlot,
  filledSlotMap,
  unequipLoadoutSlot,
} from "@/logic/loadout/state";
import { itemFitsSlot, itemSlotClassesFromType } from "@/logic/loadout/slotClass";
import { matchSetBonuses } from "@/logic/loadout/setBonus";
import type { LoadoutItem } from "@/logic/loadout/types";

const clock: CollectionClock = {
  now: () => "2026-08-27T00:00:00.000Z",
  id: () => {
    clockIds += 1;
    return `lo-${clockIds}`;
  },
};

let clockIds = 0;

function captainState(): CollectionState {
  clockIds = 0;
  return createCharacter(createEmptyCollectionState(), "Alice", clock);
}

const escort = {
  foreWeapons: 4,
  aftWeapons: 3,
  experimental: true,
  tacticalSlots: 4,
  engineeringSlots: 3,
  scienceSlots: 2,
  secondaryDeflector: false,
  devices: 2,
  hangars: 0,
};

const items: LoadoutItem[] = [
  { id: 1, name: "Phaser Dual Cannons", type: "ship fore weapon", equiplimit: null },
  { id: 2, name: "Quantum Torpedo Launcher", type: "ship aft weapon", equiplimit: 1 },
  { id: 3, name: "Temporal Defense Initiative Deflector", type: "ship deflector dish", equiplimit: 1 },
  { id: 4, name: "Temporal Defense Initiative Engine", type: "impulse engine", equiplimit: 1 },
  { id: 5, name: "Universal Console — Phase Shift", type: "universal console", equiplimit: 1 },
  { id: 6, name: "Tactical Console", type: "ship tactical console", equiplimit: null },
  { id: 7, name: "Ground Armor", type: "ground armor", equiplimit: null },
];

describe("slotClass", () => {
  it("maps wiki infobox types onto builder classes", () => {
    expect(itemSlotClassesFromType("Ship Fore Weapon")).toEqual(["foreWeapon"]);
    expect(itemSlotClassesFromType("ship weapon")).toEqual([
      "foreWeapon",
      "aftWeapon",
    ]);
    expect(itemSlotClassesFromType("universal console")).toEqual([
      "universalConsole",
    ]);
    expect(itemSlotClassesFromType("warp engine, singularity engine")).toEqual([
      "warpCore",
      "singularityCore",
    ]);
  });

  it("lets universal consoles sit in any console slot", () => {
    expect(itemFitsSlot("universal console", "tacticalConsole")).toBe(true);
    expect(itemFitsSlot("universal console", "scienceConsole")).toBe(true);
    expect(itemFitsSlot("ship tactical console", "engineeringConsole")).toBe(
      false,
    );
    expect(itemFitsSlot("ship fore weapon", "aftWeapon")).toBe(false);
    expect(itemFitsSlot("warp engine", "core")).toBe(true);
    expect(itemFitsSlot("ground armor", "deflector")).toBe(false);
  });
});

describe("buildHullSlots", () => {
  it("creates numbered sockets from hull stats plus always-on systems", () => {
    const slots = buildHullSlots(escort);
    expect(slots.filter((slot) => slot.kind === "foreWeapon")).toHaveLength(4);
    expect(slots.some((slot) => slot.id === "experimental")).toBe(true);
    expect(slots.some((slot) => slot.id === "core")).toBe(true);
    expect(slots.some((slot) => slot.id === "secondaryDeflector")).toBe(false);
    expect(groupHullSlots(slots).map((section) => section.group)).toEqual([
      "weapons",
      "consoles",
      "systems",
      "devices",
    ]);
  });
});

describe("loadout equip", () => {
  const hullSlots = buildHullSlots(escort);
  const ownedItemIds = new Set(items.map((item) => item.id));
  const context = { hullSlots, items, ownedItemIds };

  function withLoadout(): CollectionState {
    return createLoadout(captainState(), { shipId: 10 }, clock);
  }

  it("equips an owned legal item and refuses a wrong slot", () => {
    const state = withLoadout();
    const loadoutId = state.loadouts[0]!.id;
    const ok = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "foreWeapon-0", itemId: 1 },
      context,
      clock,
    );
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(filledSlotMap(ok.loadout).get("foreWeapon-0")).toBe(1);

    const illegal = equipLoadoutSlot(
      applyLoadout(state, ok.loadout),
      { loadoutId, slotId: "deflector", itemId: 1 },
      context,
      clock,
    );
    expect(illegal).toEqual({ ok: false, reason: "illegal-slot" });
  });

  it("enforces wiki equiplimit on unique copies", () => {
    let state = withLoadout();
    const loadoutId = state.loadouts[0]!.id;
    const first = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "aftWeapon-0", itemId: 2 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = applyLoadout(state, first.loadout);
    const second = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "aftWeapon-1", itemId: 2 },
      context,
      clock,
    );
    expect(second).toEqual({ ok: false, reason: "equip-limit" });
  });

  it("refuses items the captain does not own", () => {
    const state = withLoadout();
    const result = equipLoadoutSlot(
      state,
      { loadoutId: state.loadouts[0]!.id, slotId: "foreWeapon-0", itemId: 1 },
      { ...context, ownedItemIds: new Set() },
      clock,
    );
    expect(result).toEqual({ ok: false, reason: "not-owned" });
  });

  it("clears a slot", () => {
    let state = withLoadout();
    const loadoutId = state.loadouts[0]!.id;
    const equipped = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "tacticalConsole-0", itemId: 5 },
      context,
      clock,
    );
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    state = applyLoadout(state, equipped.loadout);
    state = unequipLoadoutSlot(state, { loadoutId, slotId: "tacticalConsole-0" }, clock);
    expect(state.loadouts[0]!.slots).toEqual([]);
  });

  it("deletes a loadout", () => {
    const state = deleteLoadout(withLoadout(), "lo-2");
    expect(state.loadouts).toHaveLength(0);
  });
});

describe("matchSetBonuses", () => {
  it("counts name-matching pieces and marks completion from reqItems", () => {
    const active = matchSetBonuses(
      [
        { name: "Temporal Defense Initiative Deflector" },
        { name: "Temporal Defense Initiative Engine" },
      ],
      [
        {
          id: 9,
          name: "Temporal Defense Initiative",
          reqItems: 3,
          passives: "+Hull",
        },
        { id: 10, name: "Aegis", reqItems: 3, passives: null },
      ],
    );
    expect(active).toEqual([
      {
        id: 9,
        name: "Temporal Defense Initiative",
        equipped: 2,
        required: 3,
        complete: false,
        passives: "+Hull",
      },
    ]);
  });
});

describe("hydrateCollectionState v1 to v2", () => {
  it("keeps captains and adds an empty loadouts array", () => {
    const migrated = hydrateCollectionState({
      version: 1,
      activeCharacterId: "c1",
      characters: [
        { id: "c1", name: "Alice", createdAt: "2026-08-22T00:00:00.000Z" },
      ],
      entries: [],
    });
    expect(migrated.version).toBe(2);
    expect(migrated.characters).toHaveLength(1);
    expect(migrated.loadouts).toEqual([]);
  });
});
