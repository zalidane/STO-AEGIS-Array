import { describe, expect, it } from "vitest";
import { createCharacter } from "@/logic/collection/state";
import { hydrateCollectionState } from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
  type CollectionState,
} from "@/logic/collection/types";
import { buildHullSlots, groupHullSlots, slotForGrantedConsole } from "@/logic/loadout/hullSlots";
import {
  extraHullSlotSummary,
  hasCommanderMiracleWorkerSeat,
} from "@/logic/loadout/hullExtras";
import {
  applyLoadout,
  createLoadout,
  deleteLoadout,
  equipLoadoutSlot,
  filledSlotMap,
  unequipLoadoutSlot,
  updateLoadoutSlotMods,
} from "@/logic/loadout/state";
import { itemFitsSlot, itemSlotClassesFromType } from "@/logic/loadout/slotClass";
import { matchSetBonuses } from "@/logic/loadout/setBonus";
import {
  experimentalWeaponIdsFromOwnedShips,
  ownedKeysIncludingHullGrants,
  uniqueConsoleIdsFromOwnedShips,
} from "@/logic/loadout/hullGrants";
import {
  aggregateLoadoutCosts,
  formatAggregatedAmount,
  seatedItemsForCosts,
  splitShipAbilities,
} from "@/logic/loadout/loadoutCosts";
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
    expect(itemFitsSlot("universal console", "universalConsole")).toBe(true);
    expect(itemFitsSlot("ship tactical console", "universalConsole")).toBe(
      false,
    );
    expect(itemFitsSlot("starship trait", "starshipTrait")).toBe(true);
    expect(itemFitsSlot("ship tactical console", "engineeringConsole")).toBe(
      false,
    );
    expect(itemFitsSlot("ship fore weapon", "aftWeapon")).toBe(false);
    expect(itemFitsSlot("warp engine", "core")).toBe(true);
    expect(itemFitsSlot("ground armor", "deflector")).toBe(false);
  });
});

describe("hull extras", () => {
  it("adds two T6-X upgrades and a Miracle Worker universal slot", () => {
    expect(
      extraHullSlotSummary({
        tier: 6,
        boffs: "Commander Tactical-Miracle Worker,Lieutenant Science",
      }),
    ).toMatchObject({
      universalConsoles: 3,
      starshipTraits: 2,
      devices: 2,
    });
    expect(
      hasCommanderMiracleWorkerSeat(
        "Lieutenant Commander Engineering-Miracle Worker",
      ),
    ).toBe(false);
    expect(
      extraHullSlotSummary({
        tier: 6,
        boffs: "Commander Universal-Miracle Worker,Lieutenant Science",
      }).universalConsoles,
    ).toBe(3);
    expect(
      extraHullSlotSummary({
        tier: 6,
        boffs: "Commander Tactical,Lieutenant Commander Science-Miracle Worker",
      }),
    ).toMatchObject({
      universalConsoles: 2,
      starshipTraits: 2,
      devices: 2,
    });
    expect(
      extraHullSlotSummary({ tier: 5, boffs: "Commander Tactical" }),
    ).toMatchObject({
      universalConsoles: 0,
      tacticalConsoles: 0,
      starshipTraits: 0,
      devices: 0,
    });
  });

  it("adds T5-U career console and T5-X extras when the hull can upgrade", () => {
    expect(
      extraHullSlotSummary({
        tier: 5,
        t5uConsole: "tac",
        boffs: "Commander Tactical",
      }),
    ).toMatchObject({
      tacticalConsoles: 1,
      engineeringConsoles: 0,
      scienceConsoles: 0,
      universalConsoles: 2,
      starshipTraits: 2,
      devices: 2,
    });
    expect(
      extraHullSlotSummary({
        tier: 5,
        t5uConsole: "eng",
      }).engineeringConsoles,
    ).toBe(1);
    expect(
      extraHullSlotSummary({
        tier: 5,
        t5uConsole: "sci",
      }).scienceConsoles,
    ).toBe(1);
  });
});

describe("buildHullSlots", () => {
  it("creates numbered sockets from hull stats plus always-on systems", () => {
    const slots = buildHullSlots(escort);
    expect(slots.filter((slot) => slot.kind === "foreWeapon")).toHaveLength(4);
    expect(slots.some((slot) => slot.id === "experimental")).toBe(true);
    expect(slots.some((slot) => slot.id === "core")).toBe(true);
    expect(slots.some((slot) => slot.id === "secondaryDeflector")).toBe(false);
    expect(slots.filter((slot) => slot.kind === "starshipTrait")).toHaveLength(2);
    expect(groupHullSlots(slots).map((section) => section.group)).not.toContain(
      "traits",
    );
    expect(groupHullSlots(slots).map((section) => section.group)).toEqual([
      "foreWeapons",
      "deflector",
      "impulse",
      "core",
      "shields",
      "aftWeapons",
      "experimental",
      "devices",
      "engineeringConsoles",
      "scienceConsoles",
      "tacticalConsoles",
    ]);
  });

  it("keeps rows in the in-game equipment panel order", () => {
    const slots = buildHullSlots({
      ...escort,
      hangars: 1,
      secondaryDeflector: true,
      tier: 6,
      boffs: "Commander Engineering-Miracle Worker",
    });
    expect(groupHullSlots(slots).map((section) => section.group)).toEqual([
      "foreWeapons",
      "deflector",
      "impulse",
      "core",
      "shields",
      "aftWeapons",
      "experimental",
      "devices",
      "universalConsoles",
      "engineeringConsoles",
      "scienceConsoles",
      "tacticalConsoles",
      "hangars",
    ]);
    expect(
      groupHullSlots(slots)
        .find((section) => section.group === "deflector")
        ?.slots.map((slot) => slot.kind),
    ).toEqual(["deflector", "secondaryDeflector"]);
  });

  it("adds T6 upgrade and Miracle Worker sockets", () => {
    const slots = buildHullSlots({
      ...escort,
      tier: 6,
      boffs: "Commander Engineering-Miracle Worker",
    });
    expect(slots.filter((slot) => slot.kind === "universalConsole")).toHaveLength(
      3,
    );
    expect(slots.filter((slot) => slot.kind === "starshipTrait")).toHaveLength(2);
    expect(slots.filter((slot) => slot.kind === "device")).toHaveLength(4);
    expect(
      slots
        .filter((slot) => slot.kind === "device")
        .map((slot) => slot.label),
    ).toEqual(["Device 1", "Device 2", "Device (T6-X)", "Device (T6-X2)"]);
    expect(groupHullSlots(slots).map((section) => section.group)).not.toContain(
      "traits",
    );
    expect(
      slotForGrantedConsole(slots, "universal console")?.kind,
    ).toBe("universalConsole");
  });

  it("adds a T5-U tactical socket to upgradeable T5 escorts", () => {
    const slots = buildHullSlots({
      ...escort,
      tier: 5,
      t5uConsole: "tac",
    });
    expect(slots.filter((slot) => slot.kind === "tacticalConsole")).toHaveLength(
      5,
    );
    expect(slots.filter((slot) => slot.kind === "engineeringConsole")).toHaveLength(
      3,
    );
    expect(slots.filter((slot) => slot.kind === "universalConsole")).toHaveLength(
      2,
    );
    expect(slots.filter((slot) => slot.kind === "device")).toHaveLength(4);
    expect(
      slots
        .filter((slot) => slot.kind === "tacticalConsole")
        .map((slot) => slot.label),
    ).toEqual(["Tactical 1", "Tactical 2", "Tactical 3", "Tactical 4", "Tactical 5"]);
  });
});

describe("loadout equip", () => {
  const hullSlots = buildHullSlots(escort);
  const ownedKeys = new Set(items.map((item) => `item:${item.id}`));
  const context = { hullSlots, items, ownedKeys };

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

  it("treats universal consoles as unique even without wiki equiplimit", () => {
    const hullSlots = buildHullSlots({ ...escort, tier: 6 });
    const console: LoadoutItem = {
      id: 80,
      name: "Console - Universal - Phase Shift",
      type: "universal console",
      equiplimit: null,
    };
    const context = {
      hullSlots,
      items: [...items, console],
      ownedKeys: new Set([
        ...items.map((item) => `item:${item.id}`),
        "item:80",
      ]),
    };
    let state = createLoadout(captainState(), { shipId: 10 }, clock);
    const loadoutId = state.loadouts[0]!.id;
    const first = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "universalConsole-0", itemId: 80 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = applyLoadout(state, first.loadout);
    const second = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "universalConsole-1", itemId: 80 },
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
      { ...context, ownedKeys: new Set() },
      clock,
    );
    expect(result).toEqual({ ok: false, reason: "not-owned" });
  });

  it("seats unowned items when requireOwned is false", () => {
    const state = withLoadout();
    const result = equipLoadoutSlot(
      state,
      { loadoutId: state.loadouts[0]!.id, slotId: "foreWeapon-0", itemId: 1 },
      { ...context, ownedKeys: new Set(), requireOwned: false },
      clock,
    );
    expect(result.ok).toBe(true);
  });

  it("seats a starship trait in an upgrade slot and allows removing it", () => {
    const hullSlots = buildHullSlots({ ...escort, tier: 6 });
    const trait: LoadoutItem = {
      id: 90,
      name: "Improved Gravity Well",
      type: "starship trait",
      catalogKind: "starshipTrait",
      equiplimit: 1,
    };
    const context = {
      hullSlots,
      items: [...items, trait],
      ownedKeys: new Set([
        ...items.map((item) => `item:${item.id}`),
        "starshipTrait:90",
      ]),
    };
    let state = createLoadout(captainState(), { shipId: 10 }, clock);
    const loadoutId = state.loadouts[0]!.id;
    const seated = equipLoadoutSlot(
      state,
      {
        loadoutId,
        slotId: "starshipTrait-0",
        itemId: 90,
        catalogKind: "starshipTrait",
      },
      context,
      clock,
    );
    expect(seated.ok).toBe(true);
    if (!seated.ok) return;
    state = applyLoadout(state, seated.loadout);
    state = unequipLoadoutSlot(
      state,
      { loadoutId, slotId: "starshipTrait-0" },
      clock,
    );
    expect(state.loadouts[0]!.slots).toEqual([]);
  });

  it("clears a granted unique console from a universal slot", () => {
    const hullSlots = buildHullSlots({ ...escort, tier: 6 });
    const context = {
      hullSlots,
      items,
      ownedKeys: new Set(items.map((item) => `item:${item.id}`)),
    };
    let state = createLoadout(captainState(), { shipId: 10 }, clock);
    const loadoutId = state.loadouts[0]!.id;
    const equipped = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "universalConsole-0", itemId: 5 },
      context,
      clock,
    );
    expect(equipped.ok).toBe(true);
    if (!equipped.ok) return;
    state = applyLoadout(state, equipped.loadout);
    state = unequipLoadoutSlot(
      state,
      { loadoutId, slotId: "universalConsole-0" },
      clock,
    );
    expect(state.loadouts[0]!.slots).toEqual([]);
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

  it("names the first saved hull Build 1", () => {
    expect(withLoadout().loadouts[0]?.name).toBe("Build 1");
  });

  it("stores quality and mark and copies them onto the next same-kind slot", () => {
    let state = withLoadout();
    const loadoutId = state.loadouts[0]!.id;
    const first = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "foreWeapon-0", itemId: 1 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.loadout.slots[0]).toMatchObject({
      quality: "Very Rare",
      mark: "XV",
    });

    state = applyLoadout(state, first.loadout);
    state = updateLoadoutSlotMods(
      state,
      { loadoutId, slotId: "foreWeapon-0", quality: "Epic", mark: "XII" },
      clock,
    );
    const second = equipLoadoutSlot(
      state,
      { loadoutId, slotId: "foreWeapon-1", itemId: 1 },
      context,
      clock,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(
      second.loadout.slots.find((fill) => fill.slotId === "foreWeapon-1"),
    ).toMatchObject({
      itemId: 1,
      quality: "Epic",
      mark: "XII",
    });
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
        pieces: [
          "Temporal Defense Initiative Deflector",
          "Temporal Defense Initiative Engine",
        ],
        missing: [],
      },
    ]);
  });
});

describe("hydrateCollectionState v1 to v3", () => {
  it("keeps captains, adds loadouts, and assigns a default PC account", () => {
    const migrated = hydrateCollectionState({
      version: 1,
      activeCharacterId: "c1",
      characters: [
        { id: "c1", name: "Alice", createdAt: "2026-08-22T00:00:00.000Z" },
      ],
      entries: [],
    });
    expect(migrated.version).toBe(3);
    expect(migrated.characters).toHaveLength(1);
    expect(migrated.characters[0]?.accountId).toBe("account-default");
    expect(migrated.accounts).toEqual([
      expect.objectContaining({
        id: "account-default",
        name: "PC",
        platform: "pc",
      }),
    ]);
    expect(migrated.loadouts).toEqual([]);
  });

  it("keeps seated quality and mark on v2 loadouts", () => {
    const migrated = hydrateCollectionState({
      version: 2,
      activeCharacterId: "c1",
      characters: [
        { id: "c1", name: "Alice", createdAt: "2026-08-22T00:00:00.000Z" },
      ],
      entries: [],
      loadouts: [
        {
          id: "l1",
          characterId: "c1",
          shipId: 10,
          name: "Build 1",
          createdAt: "2026-08-22T00:00:00.000Z",
          updatedAt: "2026-08-22T00:00:00.000Z",
          slots: [
            {
              slotId: "foreWeapon-0",
              itemId: 1,
              catalogKind: "item",
              quality: "Epic",
              mark: "Mk XII",
            },
          ],
        },
      ],
    });
    expect(migrated.loadouts[0]?.slots[0]).toMatchObject({
      quality: "Epic",
      mark: "Mk XII",
    });
  });
});

describe("hull grants", () => {
  const fleet = [
    { id: 1, uniconsoleId: 49852 },
    { id: 2, uniconsoleId: 100, experimentalWeaponId: 77 },
    { id: 3, uniconsoleId: null },
  ];

  it("unlocks unique consoles from every collected hull, not only the seated ship", () => {
    expect(
      uniqueConsoleIdsFromOwnedShips(fleet, new Set([1, 3])),
    ).toEqual([49852]);
    expect(
      ownedKeysIncludingHullGrants({
        ownedItemIds: [],
        ownedTraitIds: [],
        ownedShipIds: new Set([1, 2]),
        ships: fleet,
        traits: [{ id: 90, ships: [{ id: 2 }] }],
      }),
    ).toEqual(
      new Set(["item:49852", "item:100", "item:77", "starshipTrait:90"]),
    );
  });

  it("does not grant a hull console when that ship is not collected", () => {
    expect(
      uniqueConsoleIdsFromOwnedShips(fleet, new Set([3])),
    ).toEqual([]);
  });

  it("matches a unique console by wiki name when the hull has no linked id", () => {
    expect(
      uniqueConsoleIdsFromOwnedShips(
        [
          {
            id: 24,
            uniconsoleId: null,
            uniconsole: "Console - Universal -  Wing Torpedo Platforms",
          },
        ],
        new Set([24]),
        [{ id: 900, name: "Console - Universal - Wing Torpedo Platforms" }],
      ),
    ).toEqual([900]);
  });

  it("unlocks the included experimental weapon from a collected hull", () => {
    expect(
      experimentalWeaponIdsFromOwnedShips(
        [
          {
            id: 1,
            experimentalWeaponId: null,
            experimentalWeapon: "Prototype Phaser Hexa Cannons",
          },
        ],
        new Set([1]),
        [{ id: 55, name: "Prototype Phaser Hexa Cannons" }],
      ),
    ).toEqual([55]);
  });
});

describe("loadout costs", () => {
    const ships = [
      { id: 1, uniconsoleId: 10, cost: "3000;Zen" },
      { id: 2, uniconsoleId: 11, cost: "3000;Zen" },
      { id: 3, uniconsoleId: 10, cost: "1;LB" },
      {
        id: 4,
        experimentalWeaponId: 88,
        experimentalWeapon: "Prototype Phaser Hexa Cannons",
        cost: "3000;Zen",
      },
    ];
  const traits = [{ id: 90, ships: [{ id: 1, cost: "3000;Zen" }] }];

  it("aggregates granting-ship costs and splits collected from missing", () => {
    const summary = aggregateLoadoutCosts({
      seated: [
        { id: 10, name: "Console A", catalogKind: "item" },
        { id: 11, name: "Console B", catalogKind: "item" },
      ],
      ownedKeys: new Set(["item:10"]),
      ownedShipIds: new Set([1]),
      ships,
    });
    expect(summary.collected).toEqual([
      expect.objectContaining({ currencyCode: "Zen", amount: 3000 }),
    ]);
    expect(summary.notCollected).toEqual([
      expect.objectContaining({ currencyCode: "Zen", amount: 3000 }),
    ]);
  });

  it("counts a granting ship once when its console and trait are both seated", () => {
    const summary = aggregateLoadoutCosts({
      seated: [
        { id: 10, name: "Console A", catalogKind: "item" },
        { id: 90, name: "Trait A", catalogKind: "starshipTrait" },
      ],
      ownedKeys: new Set(["item:10", "starshipTrait:90"]),
      ownedShipIds: new Set([1]),
      ships,
      traits,
    });
    expect(summary.collected).toEqual([
      expect.objectContaining({ currencyCode: "Zen", amount: 3000 }),
    ]);
    expect(summary.notCollected).toEqual([]);
  });

  it("uses wiki who text when an item has no granting ship", () => {
    const summary = aggregateLoadoutCosts({
      seated: [
        {
          id: 50,
          name: "Fleet Beam Array",
          catalogKind: "item",
          who: "200000;dil",
        },
      ],
      ownedKeys: new Set(),
      ownedShipIds: new Set(),
      ships: [],
    });
    expect(summary.notCollected).toEqual([
      expect.objectContaining({
        currencyCode: "dil",
        amount: 200000,
      }),
    ]);
    expect(formatAggregatedAmount(200000)).toBe("200,000");
  });

  it("inherits granting-ship cost for a seated experimental weapon", () => {
    const summary = aggregateLoadoutCosts({
      seated: [
        {
          id: 88,
          name: "Prototype Phaser Hexa Cannons",
          catalogKind: "item",
        },
      ],
      ownedKeys: new Set(),
      ownedShipIds: new Set(),
      ships,
    });
    expect(summary.notCollected).toEqual([
      expect.objectContaining({ currencyCode: "Zen", amount: 3000 }),
    ]);
  });

  it("unions hull fills with captain-board traits without duplicating", () => {
    const catalog: LoadoutItem[] = [
      { id: 10, name: "Console A", type: "universal console", catalogKind: "item" },
      { id: 90, name: "Trait A", type: "starship trait", catalogKind: "starshipTrait" },
    ];
    const seated = seatedItemsForCosts({
      loadout: {
        slots: [
          { slotId: "universalConsole-0", itemId: 10, catalogKind: "item" },
          { slotId: "starshipTrait-0", itemId: 90, catalogKind: "starshipTrait" },
        ],
      },
      captainFills: [
        { slotId: "captainStarship-0", itemId: 90, catalogKind: "starshipTrait" },
      ],
      items: catalog,
    });
    expect(seated.map((item) => item.id)).toEqual([10, 90]);
  });

  it("counts a lock-box personal trait on the captain board", () => {
    const summary = aggregateLoadoutCosts({
      seated: [
        {
          id: 8,
          name: "Adaptive Offense",
          catalogKind: "trait",
          who: "Genetic Resequencer pack from the Borg Lock Box",
        },
      ],
      ownedKeys: new Set(),
      ownedShipIds: new Set(),
      ships: [],
    });
    expect(summary.notCollected).toEqual([
      expect.objectContaining({ currencyCode: "LB", amount: 1 }),
    ]);
  });

  it("infers lock box from wiki HTML source instead of CSS fragments", () => {
    const summary = aggregateLoadoutCosts({
      seated: [
        {
          id: 8,
          name: "Adaptive Offense",
          catalogKind: "trait",
          who: "Available from the <span style=\"font-family:'FuturaBody', Tahoma, Geneva, Arial;\" class=\"veryrare lht-data\">[[Genetic Resequencer - Space Trait: Adaptive Offense]]</span> pack, which is a random reward of the [[Borg Lock Box]] and can now be obtained from the [[Infinity Prize Pack: Personal Trait (Space)]].",
        },
      ],
      ownedKeys: new Set(),
      ownedShipIds: new Set(),
      ships: [],
    });
    expect(summary.notCollected).toEqual([
      expect.objectContaining({ currencyCode: "LB", amount: 1, label: "Lock Box" }),
    ]);
  });

  it("adds a captain starship trait’s granting-ship cost", () => {
    const summary = aggregateLoadoutCosts({
      seated: seatedItemsForCosts({
        loadout: { slots: [] },
        captainFills: [
          { slotId: "captainStarship-0", itemId: 90, catalogKind: "starshipTrait" },
        ],
        items: [
          {
            id: 90,
            name: "Trait A",
            type: "starship trait",
            catalogKind: "starshipTrait",
          },
        ],
      }),
      ownedKeys: new Set(),
      ownedShipIds: new Set(),
      ships,
      traits,
    });
    expect(summary.notCollected).toEqual([
      expect.objectContaining({ currencyCode: "Zen", amount: 3000 }),
    ]);
  });

  it("splits hull ability names on commas", () => {
    expect(splitShipAbilities("Cloak,Raider Flanking, ")).toEqual([
      "Cloak",
      "Raider Flanking",
    ]);
    expect(splitShipAbilities(null)).toEqual([]);
  });
});
