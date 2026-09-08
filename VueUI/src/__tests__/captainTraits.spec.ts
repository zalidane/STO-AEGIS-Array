import { describe, expect, it } from "vitest";
import {
  hasExtraPersonalTraitSlot,
  isCompleteIdentity,
  raceById,
  sanitizeCaptainSpecializations,
  specializationLabel,
} from "@/logic/captain/identity";
import {
  buildCaptainTraitSlots,
  groupCaptainTraitSlots,
  personalGroundSlotCount,
  personalSpaceSlotCount,
  traitAllowsCareer,
  traitAllowsRace,
  traitFitsCaptainSlot,
} from "@/logic/loadout/captainTraits";
import {
  applyCaptainTraitLoadout,
  equipCaptainTraitSlot,
} from "@/logic/loadout/captainTraitState";
import {
  createCharacter,
  hydrateCollectionState,
  updateCharacter,
} from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
} from "@/logic/collection/types";
import { createLoadout } from "@/logic/loadout/state";

const clock: CollectionClock = {
  now: () => "2026-08-29T00:00:00.000Z",
  id: () => "cap-1",
};

let loadoutSeq = 0;
const loadoutClock: CollectionClock = {
  now: () => "2026-08-29T00:00:00.000Z",
  id: () => `lo-${++loadoutSeq}`,
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
        race: "ferasan",
      }),
    ).toBe(false);
    expect(hasExtraPersonalTraitSlot("federation", "alien")).toBe(true);
    expect(hasExtraPersonalTraitSlot("federation", "human")).toBe(false);
    expect(raceById("klingon", "nausicaan")?.label).toBe("Nausicaan");
  });

  it("keeps primary and secondary specializations distinct", () => {
    expect(
      sanitizeCaptainSpecializations("temporal", "strategist"),
    ).toEqual({
      primarySpecialization: "temporal",
      secondarySpecialization: "strategist",
    });
    expect(sanitizeCaptainSpecializations("temporal", "temporal")).toEqual({
      primarySpecialization: "temporal",
    });
    expect(sanitizeCaptainSpecializations("", "strategist")).toEqual({});
    expect(specializationLabel("miracle")).toBe("Miracle Worker");
  });
});

describe("captain trait slots", () => {
  it("gives every captain the upgrade personal slot, plus one more for Alien", () => {
    expect(personalSpaceSlotCount("federation", "human")).toBe(10);
    expect(personalSpaceSlotCount("federation", "alien")).toBe(11);
    expect(personalGroundSlotCount("federation", "human")).toBe(10);
    expect(personalGroundSlotCount("federation", "alien")).toBe(11);
    const human = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    });
    const alien = buildCaptainTraitSlots({
      faction: "federation",
      race: "alien",
    });
    expect(human.filter((slot) => slot.group === "personalSpace")).toHaveLength(
      10,
    );
    expect(alien.filter((slot) => slot.group === "personalSpace")).toHaveLength(
      11,
    );
    expect(human.filter((slot) => slot.group === "starship")).toHaveLength(5);
    expect(human.filter((slot) => slot.group === "shipSpecific")).toHaveLength(2);
    expect(
      human
        .filter((slot) => slot.group === "shipSpecific")
        .every((slot) => slot.storage === "loadout" && !slot.locked),
    ).toBe(true);
    expect(human.every((slot) => slot.storage === "loadout")).toBe(true);
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

  it("seats a collected personal trait on the active loadout (#16)", () => {
    loadoutSeq = 0;
    let state = createCharacter(createEmptyCollectionState(), {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "human",
    }, clock);
    state = createLoadout(state, { shipId: 10 }, loadoutClock);
    const loadoutId = state.loadouts[0]!.id;
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
      {
        loadoutId,
        slotId: "personalSpace-0",
        itemId: 8,
        catalogKind: "trait",
      },
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
    state = applyCaptainTraitLoadout(state, result.loadout);
    expect(state.characters[0]?.traitSlots ?? []).toEqual([]);
    expect(state.loadouts[0]?.slots).toEqual([
      { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
    ]);
  });

  it("seats a collected active-reputation trait in the fifth socket", () => {
    loadoutSeq = 0;
    let state = createCharacter(createEmptyCollectionState(), {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "human",
    }, clock);
    state = createLoadout(state, { shipId: 10 }, loadoutClock);
    const loadoutId = state.loadouts[0]!.id;
    const slots = buildCaptainTraitSlots({
      faction: "federation",
      race: "human",
    });
    const result = equipCaptainTraitSlot(
      state,
      {
        loadoutId,
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
    state = applyCaptainTraitLoadout(state, result.loadout);
    expect(state.loadouts[0]?.slots).toEqual([
      {
        slotId: "activeSpaceReputation-4",
        itemId: 9,
        catalogKind: "trait",
      },
    ]);
  });

  it("drops the Alien extra personal fill when the captain changes race", () => {
    loadoutSeq = 0;
    let state = createCharacter(createEmptyCollectionState(), {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "alien",
    }, clock);
    state = createLoadout(state, { shipId: 10 }, loadoutClock);
    const loadoutId = state.loadouts[0]!.id;
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
      {
        loadoutId,
        slotId: "personalSpace-10",
        itemId: 8,
        catalogKind: "trait",
      },
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
    state = applyCaptainTraitLoadout(state, result.loadout);
    state = updateCharacter(state, "cap-1", { race: "human" });
    expect(state.characters[0]?.race).toBe("human");
    expect(state.loadouts[0]?.slots).toEqual([]);
  });

  it("migrates character traitSlots onto each loadout at hydrate v4 (#16)", () => {
    const hydrated = hydrateCollectionState({
      version: 3,
      activeCharacterId: "c1",
      characters: [
        {
          id: "c1",
          name: "Alice",
          createdAt: "2026-08-29T00:00:00.000Z",
          career: "tactical",
          faction: "federation",
          race: "human",
          traitSlots: [
            { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
            {
              slotId: "captainStarship-0",
              itemId: 3,
              catalogKind: "starshipTrait",
            },
          ],
        },
      ],
      entries: [],
      loadouts: [
        {
          id: "lo-1",
          characterId: "c1",
          shipId: 10,
          name: "Build 1",
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-29T00:00:00.000Z",
          slots: [
            { slotId: "starshipTrait-0", itemId: 99, catalogKind: "starshipTrait" },
          ],
        },
        {
          id: "lo-2",
          characterId: "c1",
          shipId: 11,
          name: "Build 2",
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-29T00:00:00.000Z",
          slots: [],
        },
      ],
    });
    expect(hydrated.version).toBe(4);
    expect(hydrated.characters[0]?.traitSlots).toEqual([]);
    expect(hydrated.loadouts[0]?.slots).toEqual([
      { slotId: "starshipTrait-0", itemId: 99, catalogKind: "starshipTrait" },
      { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
      {
        slotId: "captainStarship-0",
        itemId: 3,
        catalogKind: "starshipTrait",
      },
    ]);
    expect(hydrated.loadouts[1]?.slots).toEqual([
      { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
      {
        slotId: "captainStarship-0",
        itemId: 3,
        catalogKind: "starshipTrait",
      },
    ]);
  });

  it("stores captain specializations and drops a duplicate secondary", () => {
    let state = createCharacter(
      createEmptyCollectionState(),
      {
        name: "Alice",
        career: "tactical",
        faction: "federation",
        race: "human",
        primarySpecialization: "temporal",
        secondarySpecialization: "temporal",
      },
      clock,
    );
    expect(state.characters[0]?.primarySpecialization).toBe("temporal");
    expect(state.characters[0]?.secondarySpecialization).toBeUndefined();
    state = updateCharacter(state, "cap-1", {
      secondarySpecialization: "strategist",
    });
    expect(state.characters[0]?.secondarySpecialization).toBe("strategist");
    state = updateCharacter(state, "cap-1", { primarySpecialization: "" });
    expect(state.characters[0]?.primarySpecialization).toBeUndefined();
    expect(state.characters[0]?.secondarySpecialization).toBeUndefined();

    const hydrated = hydrateCollectionState({
      version: 3,
      activeCharacterId: "c1",
      characters: [
        {
          id: "c1",
          name: "Alice",
          createdAt: "2026-08-29T00:00:00.000Z",
          career: "tactical",
          faction: "federation",
          race: "human",
          primarySpecialization: "temporal",
          secondarySpecialization: "nope",
        },
      ],
      entries: [],
      loadouts: [],
    });
    expect(hydrated.version).toBe(4);
    expect(hydrated.characters[0]?.primarySpecialization).toBe("temporal");
    expect(hydrated.characters[0]?.secondarySpecialization).toBeUndefined();
  });
});
