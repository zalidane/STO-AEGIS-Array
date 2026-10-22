import { describe, expect, it } from "vitest";
import { formatCollectedHullCell } from "@/logic/advancedShipSearch";
import {
  collectItem,
  createAccount,
  createCharacter,
  setActiveCharacter,
} from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
  type CollectionState,
} from "@/logic/collection/types";

const clock: CollectionClock = {
  now: () => "2026-10-21T00:00:00.000Z",
  id: () => {
    clockIds += 1;
    return `id-${clockIds}`;
  },
};

let clockIds = 0;

function fresh(): CollectionState {
  clockIds = 0;
  return createEmptyCollectionState();
}

describe("formatCollectedHullCell", () => {
  it("leaves the cell empty when the active account has no copy", () => {
    let state = fresh();
    state = createCharacter(state, "Alice", clock);
    expect(formatCollectedHullCell(state, { id: 7, cost: "3000;Zen" })).toBe(
      "",
    );
    expect(formatCollectedHullCell(createEmptyCollectionState(), { id: 7 })).toBe(
      "",
    );
  });

  it("shows Account when any copy on the account is account-bound", () => {
    let state = fresh();
    state = createCharacter(state, "Alice", clock);
    state = collectItem(
      state,
      { kind: "ship", catalogId: 4, bind: "account" },
      clock,
    );
    const aliceId = state.activeCharacterId;
    state = createCharacter(state, "Bob", clock);
    state = collectItem(
      state,
      { kind: "ship", catalogId: 4, bind: "character" },
      clock,
    );
    expect(formatCollectedHullCell(state, { id: 4, cost: "1;LB" })).toBe(
      "Collected: Account",
    );

    state = setActiveCharacter(state, aliceId);
    expect(formatCollectedHullCell(state, { id: 4, cost: "1;LB" })).toBe(
      "Collected: Account",
    );
  });

  it("lists character-bound captains and ignores other accounts", () => {
    let state = fresh();
    state = createAccount(state, { name: "PC", platform: "pc" }, clock);
    state = createCharacter(state, "Alice", clock);
    state = collectItem(
      state,
      { kind: "ship", catalogId: 8, bind: "character" },
      clock,
    );
    const aliceId = state.characters.find((row) => row.name === "Alice")?.id;
    state = createCharacter(state, "Bob", clock);
    state = collectItem(
      state,
      { kind: "ship", catalogId: 8, bind: "character" },
      clock,
    );
    state = createCharacter(state, "Carol", clock);
    expect(formatCollectedHullCell(state, { id: 8, cost: "1;LB" })).toBe(
      "Collected: Alice, Bob",
    );

    state = createAccount(state, { name: "Xbox", platform: "xbox" }, clock);
    state = createCharacter(state, "Kara", clock);
    state = collectItem(
      state,
      { kind: "ship", catalogId: 8, bind: "character" },
      clock,
    );
    expect(formatCollectedHullCell(state, { id: 8, cost: "1;LB" })).toBe(
      "Collected: Kara",
    );

    state = setActiveCharacter(state, aliceId ?? null);
    expect(formatCollectedHullCell(state, { id: 8, cost: "1;LB" })).toBe(
      "Collected: Alice, Bob",
    );
  });

  it("uses the catalog cost when a copy does not store a bind", () => {
    let state = fresh();
    state = createCharacter(state, "Alice", clock);
    state = collectItem(state, { kind: "ship", catalogId: 3 }, clock);
    expect(formatCollectedHullCell(state, { id: 3, cost: "3000;Zen" })).toBe(
      "Collected: Account",
    );
    expect(formatCollectedHullCell(state, { id: 3, cost: "1;LB" })).toBe(
      "Collected: Alice",
    );
  });
});
