import { describe, expect, it } from "vitest";
import {
  allowsAccountUnlockFromCost,
  bindScopeChoiceCaption,
  bindScopeFromBoundTo,
  bindScopeFromShipCost,
  bindScopeForKind,
  bindScopeLabel,
  defaultBindForKind,
  inheritBindFromGrantingShips,
  resolveBindScope,
} from "@/logic/collection/bind";
import {
  allowsAccountUnlockFromCatalog,
  bindScopeFromCatalog,
} from "@/logic/collection/catalogBind";
import { filterEquipmentInfoboxes } from "@/logic/collection/itemBrowser";
import {
  collectItem,
  collectMany,
  collectionStatus,
  createCharacter,
  deleteCharacter,
  ownedCopyCount,
  setEntryBind,
  uncollectItem,
  uncollectMany,
  visibleEntriesForActiveCharacter,
} from "@/logic/collection/state";
import {
  catalogKindFromSearchType,
  splitHitsByOwnership,
} from "@/logic/collection/searchCatalog";
import {
  collectionKindEmptyCopy,
  groupCollectionByKind,
  resolveCollectionTab,
} from "@/logic/collection/kindTabs";
import {
  createEmptyCollectionState,
  type CollectionClock,
  type CollectionState,
} from "@/logic/collection/types";
import {
  COLLECTION_STORAGE_KEY,
  createLocalStorageCollectionRepository,
} from "@/models/collection/localStorageRepository";

const clock: CollectionClock = {
  now: () => "2026-08-22T00:00:00.000Z",
  id: () => {
    clockIds += 1;
    return `id-${clockIds}`;
  },
};

let clockIds = 0;

function resetClock() {
  clockIds = 0;
}

function withCaptains(): CollectionState {
  resetClock();
  let state = createEmptyCollectionState();
  state = createCharacter(state, "Alice", clock);
  state = createCharacter(state, "Bob", clock);
  return state;
}

describe("bindScope", () => {
  it("reads Infobox boundto", () => {
    expect(bindScopeFromBoundTo("Account")).toBe("account");
    expect(bindScopeFromBoundTo("character")).toBe("character");
    expect(bindScopeFromBoundTo(null)).toBe("unknown");
    expect(bindScopeFromBoundTo("yes")).toBe("unknown");
  });

  it("keeps list captions short and reserves full phrases for choice copy", () => {
    expect(bindScopeLabel("account")).toBe("BtA");
    expect(bindScopeLabel("character")).toBe("BtC");
    expect(bindScopeLabel("unknown")).toBe("Bind unknown");
    expect(bindScopeChoiceCaption("account")).toBe("Unlocked for account");
    expect(bindScopeChoiceCaption("character")).toBe("Bound to this captain");
    expect(bindScopeChoiceCaption("unknown")).toBe("Bound to this captain");
  });

  it("defaults personal traits to character; ships and grants need acquisition data", () => {
    expect(defaultBindForKind("ship")).toBe("unknown");
    expect(defaultBindForKind("starshipTrait")).toBe("unknown");
    expect(defaultBindForKind("trait")).toBe("character");
    expect(resolveBindScope({ kind: "item", boundto: "account" })).toBe(
      "account",
    );
  });

  it("treats Zen Store and dilithium/fleet unlocks as BtA", () => {
    expect(bindScopeFromShipCost("3000;Zen")).toBe("account");
    expect(bindScopeFromShipCost("200000;dil")).toBe("account");
    expect(bindScopeFromShipCost("1;LB / 3000;Zen")).toBe("account");
  });

  it("defaults Phoenix and Anniversary Prize Pack ships to BtC with an account-unlock choice", () => {
    expect(bindScopeFromShipCost("1;PPP5")).toBe("character");
    expect(bindScopeFromShipCost("20;APP")).toBe("character");
    expect(bindScopeFromShipCost("1;LB / 1;PPP5")).toBe("character");
    expect(allowsAccountUnlockFromCost("1;PPP5")).toBe(true);
    expect(allowsAccountUnlockFromCost("20;APP")).toBe(true);
    expect(allowsAccountUnlockFromCost("1;LB / 1;PPP5")).toBe(true);
    expect(allowsAccountUnlockFromCost("3000;Zen")).toBe(false);
  });

  it("offers a bind choice when a Zen hull also has a non-Zen path or costs more than 10,000 Zen", () => {
    expect(allowsAccountUnlockFromCost("1;LB / 3000;Zen")).toBe(true);
    expect(allowsAccountUnlockFromCost("1;LB / 29500;Zen")).toBe(true);
    expect(allowsAccountUnlockFromCost("20000;Zen")).toBe(true);
    expect(allowsAccountUnlockFromCost("10000;Zen")).toBe(false);
    expect(allowsAccountUnlockFromCost("10001;Zen")).toBe(true);
    expect(
      allowsAccountUnlockFromCost("12000;Zen", { displayPrefix: "Legendary" }),
    ).toBe(false);
    expect(
      allowsAccountUnlockFromCost("12000;Zen", {
        name: "Legendary Akira Multi-Mission Command Cruiser",
      }),
    ).toBe(false);
  });

  it("treats lockbox and lobi-only ships as BtC", () => {
    expect(bindScopeFromShipCost("1;LB")).toBe("character");
    expect(bindScopeFromShipCost("800;LC")).toBe("character");
    expect(bindScopeFromShipCost("1;MR")).toBe("character");
    expect(allowsAccountUnlockFromCost("1;LB")).toBe(false);
  });

  it("inherits hull bind onto granted traits and consoles", () => {
    expect(inheritBindFromGrantingShips(["3000;Zen", "1;LB"])).toBe("account");
    expect(inheritBindFromGrantingShips(["1;LB", "800;LC"])).toBe("character");
    expect(inheritBindFromGrantingShips([])).toBe("unknown");
    expect(
      bindScopeForKind({
        kind: "item",
        boundto: "character",
        grantingShipCosts: ["3000;Zen"],
      }),
    ).toBe("account");
    expect(
      bindScopeForKind({
        kind: "item",
        boundto: "character",
        grantingShipCosts: ["1;LB"],
      }),
    ).toBe("character");
  });

  it("resolves catalog bind from ship cost and unique-console grants", () => {
    const sources = {
      ships: [
        { id: 1, cost: "3000;Zen", uniconsoleId: 10 },
        { id: 2, cost: "1;LB", uniconsoleId: 11 },
      ],
      starshipTraits: [{ id: 5, ships: [{ cost: "1;LB" }] }],
      items: [
        { id: 10, boundto: "character" },
        { id: 11, boundto: "account" },
        { id: 12, boundto: "character" },
      ],
    };
    expect(bindScopeFromCatalog(sources, "ship", 1)).toBe("account");
    expect(bindScopeFromCatalog(sources, "ship", 2)).toBe("character");
    expect(bindScopeFromCatalog(sources, "starshipTrait", 5)).toBe("character");
    expect(bindScopeFromCatalog(sources, "item", 10)).toBe("account");
    expect(bindScopeFromCatalog(sources, "item", 11)).toBe("character");
    expect(bindScopeFromCatalog(sources, "item", 12)).toBe("character");
  });

  it("resolves catalog bind from experimental-weapon hull grants", () => {
    const sources = {
      ships: [{ id: 1, cost: "3000;Zen", experimentalWeaponId: 20 }],
      starshipTraits: [],
      items: [{ id: 20, boundto: "character" }],
    };
    expect(bindScopeFromCatalog(sources, "item", 20)).toBe("account");
  });

  it("offers a catalog bind choice for dual-path and expensive Zen ships", () => {
    const sources = {
      ships: [
        { id: 1, cost: "3000;Zen" },
        { id: 2, cost: "1;LB / 29500;Zen" },
        { id: 3, cost: "20000;Zen" },
        {
          id: 4,
          cost: "12000;Zen",
          displayPrefix: "Legendary",
          name: "Legendary Akira Multi-Mission Command Cruiser",
        },
      ],
      starshipTraits: [{ id: 5, ships: [{ cost: "1;LB / 29500;Zen" }] }],
      items: [],
    };
    expect(allowsAccountUnlockFromCatalog(sources, "ship", 1)).toBe(false);
    expect(allowsAccountUnlockFromCatalog(sources, "ship", 2)).toBe(true);
    expect(allowsAccountUnlockFromCatalog(sources, "ship", 3)).toBe(true);
    expect(allowsAccountUnlockFromCatalog(sources, "ship", 4)).toBe(false);
    expect(allowsAccountUnlockFromCatalog(sources, "starshipTrait", 5)).toBe(
      true,
    );
  });
});

describe("equipment infobox filter", () => {
  it("keeps consoles, weapons, and kits; drops lockboxes and inventory", () => {
    const kept = filterEquipmentInfoboxes([
      { type: "Universal Console" },
      { type: "Experimental Weapon" },
      { type: "Inventory" },
      { type: "Lock Box" },
      { type: null },
    ]);
    expect(kept.map((item) => item.type)).toEqual([
      "Universal Console",
      "Experimental Weapon",
    ]);
  });
});

describe("collection state", () => {
  it("creates captains and keeps the newest one active", () => {
    const state = withCaptains();
    expect(state.characters.map((c) => c.name)).toEqual(["Alice", "Bob"]);
    expect(state.activeCharacterId).toBe("id-2");
  });

  it("lets each captain collect their own BtA copy, and shows the other copy", () => {
    let state = withCaptains();
    state = collectItem(state, { kind: "ship", catalogId: 10 }, clock);

    const onBob = collectionStatus(state, {
      kind: "ship",
      catalogId: 10,
      bind: "account",
    });
    expect(onBob.ownedByActive).toBe(true);
    expect(onBob.otherAccountCopies).toEqual([]);

    state = { ...state, activeCharacterId: "id-1" };
    const onAlice = collectionStatus(state, {
      kind: "ship",
      catalogId: 10,
      bind: "account",
    });
    expect(onAlice.ownedByActive).toBe(false);
    expect(onAlice.otherAccountCopies).toEqual([
      { characterId: "id-2", characterName: "Bob", isActive: false },
    ]);

    state = collectItem(state, { kind: "ship", catalogId: 10 }, clock);
    expect(
      collectionStatus(state, {
        kind: "ship",
        catalogId: 10,
        bind: "account",
      }).ownedByActive,
    ).toBe(true);
    expect(state.entries).toHaveLength(2);
  });

  it("shows a Phoenix copy on other captains only after it is marked unlocked for account", () => {
    let state = withCaptains();
    state = collectItem(
      state,
      { kind: "ship", catalogId: 10, bind: "character" },
      clock,
    );
    state = { ...state, activeCharacterId: "id-1" };
    expect(
      collectionStatus(state, {
        kind: "ship",
        catalogId: 10,
        bind: "character",
      }).otherAccountCopies,
    ).toEqual([]);

    state = { ...state, activeCharacterId: "id-2" };
    state = setEntryBind(state, {
      kind: "ship",
      catalogId: 10,
      bind: "account",
    });
    state = { ...state, activeCharacterId: "id-1" };
    expect(
      collectionStatus(state, {
        kind: "ship",
        catalogId: 10,
        bind: "character",
      }).otherAccountCopies,
    ).toEqual([
      { characterId: "id-2", characterName: "Bob", isActive: false },
    ]);
  });

  it("hides another captain's character-bound items", () => {
    let state = withCaptains();
    state = collectItem(state, { kind: "trait", catalogId: 4 }, clock);
    state = { ...state, activeCharacterId: "id-1" };

    const status = collectionStatus(state, {
      kind: "trait",
      catalogId: 4,
      bind: "character",
    });
    expect(status.ownedByActive).toBe(false);
    expect(status.otherAccountCopies).toEqual([]);

    const visible = visibleEntriesForActiveCharacter(state, () => "character");
    expect(visible).toEqual([]);
  });

  it("uncollects only the active captain's copy", () => {
    let state = withCaptains();
    state = collectItem(state, { kind: "item", catalogId: 9 }, clock);
    state = { ...state, activeCharacterId: "id-1" };
    state = collectItem(state, { kind: "item", catalogId: 9 }, clock);
    state = uncollectItem(state, { kind: "item", catalogId: 9 });
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0]?.characterId).toBe("id-2");
  });

  it("allows extra copies of non-unique items and uncollects one at a time", () => {
    let state = withCaptains();
    state = collectItem(state, { kind: "item", catalogId: 9 }, clock);
    state = collectItem(
      state,
      { kind: "item", catalogId: 9, allowDuplicate: true },
      clock,
    );
    expect(ownedCopyCount(state, { kind: "item", catalogId: 9 })).toBe(2);

    state = uncollectItem(state, { kind: "item", catalogId: 9 });
    expect(ownedCopyCount(state, { kind: "item", catalogId: 9 })).toBe(1);
    expect(state.entries.map((entry) => entry.characterId)).toEqual(["id-2"]);
  });

  it("keeps ships unique even when a duplicate collect is requested", () => {
    let state = withCaptains();
    state = collectItem(state, { kind: "ship", catalogId: 10 }, clock);
    state = collectItem(
      state,
      { kind: "ship", catalogId: 10, allowDuplicate: true },
      clock,
    );
    expect(ownedCopyCount(state, { kind: "ship", catalogId: 10 })).toBe(1);
  });

  it("collects and uncollects a batch for the active captain", () => {
    let state = withCaptains();
    state = collectMany(
      state,
      [
        { kind: "ship", catalogId: 1, bind: "account" },
        { kind: "ship", catalogId: 2 },
        { kind: "item", catalogId: 9 },
      ],
      clock,
    );
    expect(
      state.entries
        .filter((entry) => entry.characterId === "id-2")
        .map((entry) => entry.catalogId),
    ).toEqual([1, 2, 9]);

    state = uncollectMany(state, [
      { kind: "ship", catalogId: 1 },
      { kind: "item", catalogId: 9 },
    ]);
    expect(
      state.entries
        .filter((entry) => entry.characterId === "id-2")
        .map((entry) => entry.catalogId),
    ).toEqual([2]);
  });

  it("drops a captain's entries when the folder is deleted", () => {
    let state = withCaptains();
    state = collectItem(state, { kind: "ship", catalogId: 1 }, clock);
    state = deleteCharacter(state, "id-2");
    expect(state.characters.map((c) => c.name)).toEqual(["Alice"]);
    expect(state.activeCharacterId).toBe("id-1");
    expect(state.entries).toEqual([]);
  });
});

describe("collection kind tabs", () => {
  it("groups rows in catalog order and keeps empty kinds", () => {
    const tabs = groupCollectionByKind(
      [
        { id: "t1", kind: "trait" as const },
        { id: "s1", kind: "ship" as const },
        { id: "i1", kind: "item" as const },
      ],
      (row) => row.kind,
    );
    expect(tabs.map((tab) => tab.kind)).toEqual([
      "ship",
      "trait",
      "starshipTrait",
      "item",
    ]);
    expect(tabs.map((tab) => tab.rows.map((row) => row.id))).toEqual([
      ["s1"],
      ["t1"],
      [],
      ["i1"],
    ]);
  });

  it("resolves a requested tab or falls back to ships", () => {
    expect(resolveCollectionTab("item")).toBe("item");
    expect(resolveCollectionTab("nope")).toBe("ship");
    expect(resolveCollectionTab(undefined)).toBe("ship");
    expect(collectionKindEmptyCopy("starshipTrait")).toBe(
      "No starship traits collected yet.",
    );
  });
});

describe("search catalog collection mapping", () => {
  it("maps collectible search types and ignores the rest", () => {
    expect(catalogKindFromSearchType("Ship")).toBe("ship");
    expect(catalogKindFromSearchType("Trait")).toBe("trait");
    expect(catalogKindFromSearchType("StarshipTrait")).toBe("starshipTrait");
    expect(catalogKindFromSearchType("Infobox")).toBe("item");
    expect(catalogKindFromSearchType("TraySkill")).toBeNull();
    expect(catalogKindFromSearchType("Reputation")).toBeNull();
  });

  it("splits hits into missing vs already collected", () => {
    expect(
      splitHitsByOwnership(
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        new Set([2]),
      ),
    ).toEqual({ missingIds: [1, 3], collectedIds: [2] });
  });
});

describe("localStorage repository", () => {
  it("round-trips state and recovers from corrupt JSON", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const repo = createLocalStorageCollectionRepository(storage);
    const saved = createCharacter(createEmptyCollectionState(), "Alice", clock);
    repo.save(saved);
    expect(repo.load().characters[0]?.name).toBe("Alice");

    memory.set(COLLECTION_STORAGE_KEY, "{not json");
    expect(repo.load().characters).toEqual([]);
  });
});
