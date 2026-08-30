import { describe, expect, it } from "vitest";
import {
  hasExtraPersonalTraitSlot,
  isCompleteIdentity,
  raceById,
} from "@/logic/captain/identity";
import {
  buildCaptainTraitSlots,
  groupCaptainTraitSlots,
  personalSpaceSlotCount,
  traitAllowsCareer,
  traitAllowsRace,
  traitFitsCaptainSlot,
} from "@/logic/loadout/captainTraits";
import {
  applyCaptainTraitFills,
  equipCaptainTraitSlot,
} from "@/logic/loadout/captainTraitState";
import {
  createCharacter,
  updateCharacter,
} from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
} from "@/logic/collection/types";

const clock: CollectionClock = {
  now: () => "2026-08-29T00:00:00.000Z",
  id: () => "cap-1",
};

describe("captain identity", () => {
  it("requires class, faction, and a race from that faction", () => {
    expect(
      isCompleteIdentity({
        career: "tactical",
        faction: "federation",
        race: "human",
      }),
    ).toBe(true);
    expect(
      isCompleteIdentity({
        career: "tactical",
        faction: "federation",
        race: "klingon",
      }),
    ).toBe(false);
    expect(hasExtraPersonalTraitSlot("federation", "alien")).toBe(true);
    expect(hasExtraPersonalTraitSlot("federation", "human")).toBe(false);
    expect(raceById("klingon", "nausicaan")?.label).toBe("Nausicaan");
  });
});

describe("captain trait slots", () => {
  it("gives Alien captains a tenth personal space slot", () => {
    expect(personalSpaceSlotCount("federation", "human")).toBe(9);
    expect(personalSpaceSlotCount("federation", "alien")).toBe(10);
    const human = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    });
    const alien = buildCaptainTraitSlots({
      faction: "federation",
      race: "alien",
    });
    expect(human.filter((slot) => slot.group === "personalSpace")).toHaveLength(
      9,
    );
    expect(alien.filter((slot) => slot.group === "personalSpace")).toHaveLength(
      10,
    );
    expect(human.filter((slot) => slot.group === "starship")).toHaveLength(5);
    expect(human.filter((slot) => slot.group === "shipSpecific")).toHaveLength(2);
    expect(
      human
        .filter((slot) => slot.group === "shipSpecific")
        .every((slot) => slot.storage === "loadout" && !slot.locked),
    ).toBe(true);
    expect(
      groupCaptainTraitSlots(human).map((section) => section.group),
    ).toEqual([
      "personalSpace",
      "starship",
      "shipSpecific",
      "spaceReputation",
      "activeSpaceReputation",
    ]);
    expect(human.every((slot) => !slot.locked)).toBe(true);
    expect(
      human.filter((slot) => slot.group === "activeSpaceReputation"),
    ).toHaveLength(5);
    expect(
      human.filter((slot) => slot.group === "spaceReputation"),
    ).toHaveLength(5);
  });

  it("keeps career and racial personal traits on matching captains", () => {
    const slot = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    }).find((row) => row.group === "personalSpace")!;
    const crippling = {
      id: 1,
      name: "Crippling Fire",
      type: "char",
      environment: "space",
      career: "tac",
      catalogKind: "trait" as const,
    };
    expect(
      traitFitsCaptainSlot(crippling, slot, { career: "tactical", raceLabel: "Human" }),
    ).toBe(true);
    expect(
      traitFitsCaptainSlot(crippling, slot, { career: "science", raceLabel: "Human" }),
    ).toBe(false);
    expect(traitAllowsRace("Human,", "Human")).toBe(true);
    expect(traitAllowsRace("Joined Trill,", "Human")).toBe(false);
    expect(traitAllowsRace("Jem'Hadar Vanguard,", "Jem'Hadar")).toBe(true);
    expect(traitAllowsCareer("eng", "engineering")).toBe(true);
    expect(traitAllowsCareer("eng", "tactical")).toBe(false);
    const shipSlot = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    }).find((row) => row.group === "shipSpecific")!;
    expect(
      traitFitsCaptainSlot(
        {
          id: 2,
          name: "Angle On The Bow",
          type: "starship trait",
          environment: null,
          catalogKind: "starshipTrait",
        },
        shipSlot,
      ),
    ).toBe(true);
  });

  it("seats a collected personal trait on the captain board", () => {
    let state = createCharacter(createEmptyCollectionState(), {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "human",
    }, clock);
    const slots = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    });
    const trait = {
      id: 8,
      name: "Accurate",
      type: "char",
      environment: "space",
      catalogKind: "trait" as const,
    };
    const result = equipCaptainTraitSlot(
      state,
      { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
      {
        slots,
        traits: [trait],
        ownedKeys: new Set(["trait:8"]),
        career: "tactical",
        raceLabel: "Human",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = applyCaptainTraitFills(state, result.fills);
    expect(state.characters[0]?.traitSlots).toEqual([
      { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
    ]);
  });

  it("seats a collected active-reputation trait in the fifth socket", () => {
    let state = createCharacter(createEmptyCollectionState(), {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "human",
    }, clock);
    const slots = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    });
    const result = equipCaptainTraitSlot(
      state,
      {
        slotId: "activeSpaceReputation-4",
        itemId: 9,
        catalogKind: "trait",
      },
      {
        slots,
        traits: [
          {
            id: 9,
            name: "Active Reputation",
            type: "activereputation",
            environment: "space",
            catalogKind: "trait",
          },
        ],
        ownedKeys: new Set(["trait:9"]),
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = applyCaptainTraitFills(state, result.fills);
    expect(state.characters[0]?.traitSlots).toEqual([
      {
        slotId: "activeSpaceReputation-4",
        itemId: 9,
        catalogKind: "trait",
      },
    ]);
  });

  it("drops the tenth personal fill when an Alien captain changes race", () => {
    let state = createCharacter(createEmptyCollectionState(), {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "alien",
    }, clock);
    const slots = buildCaptainTraitSlots({
      faction: "federation",
      race: "alien",
    });
    const trait = {
      id: 8,
      name: "Accurate",
      type: "char",
      environment: "space",
      catalogKind: "trait" as const,
    };
    const result = equipCaptainTraitSlot(
      state,
      { slotId: "personalSpace-9", itemId: 8, catalogKind: "trait" },
      {
        slots,
        traits: [trait],
        ownedKeys: new Set(["trait:8"]),
        career: "tactical",
        raceLabel: "Alien",
      },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    state = applyCaptainTraitFills(state, result.fills);
    state = updateCharacter(state, "cap-1", { race: "human" });
    expect(state.characters[0]?.race).toBe("human");
    expect(state.characters[0]?.traitSlots).toEqual([]);
  });
});
