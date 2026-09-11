import { describe, expect, it } from "vitest";
import { buildCaptainTraitSlots } from "@/logic/loadout/captainTraits";
import { buildBoffStations } from "@/logic/loadout/boffPowers";
import { toLoadoutTraySkill } from "@/logic/loadout/catalogMap";
import {
  fittingBoffPowers,
  fittingCaptainTraits,
  fittingItems,
  pickerCandidatesFor,
} from "@/logic/loadout/pickerCandidates";
import type { LoadoutItem } from "@/logic/loadout/types";
import type { HullSlot } from "@/logic/loadout/hullSlots";

function defined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("expected a defined value");
  return value;
}

const phaser: LoadoutItem = {
  id: 1,
  name: "Phaser Dual Cannons",
  type: "ship fore weapon",
  catalogKind: "item",
};

const disruptor: LoadoutItem = {
  id: 2,
  name: "Disruptor Dual Cannons",
  type: "ship fore weapon",
  catalogKind: "item",
  searchText: "kinetic",
};

const uni: LoadoutItem = {
  id: 10,
  name: "Console - Universal - Phase Shift",
  type: "universal console",
  catalogKind: "item",
};

const barrage: LoadoutItem = {
  id: 21,
  name: "Beam Barrage",
  type: "char",
  catalogKind: "trait",
  environment: "space",
};

const jam = toLoadoutTraySkill({
  id: 7,
  name: "Jam Targeting Sensors",
  type: "Science",
  region: "Space",
  rank1rank: "Ensign",
  rank2rank: "Lieutenant",
  rank3rank: "Lieutenant Commander",
});

const fore0: HullSlot = {
  id: "foreWeapon-0",
  kind: "foreWeapon",
  group: "foreWeapons",
  label: "Fore 1",
  index: 0,
};

const fore1: HullSlot = {
  id: "foreWeapon-1",
  kind: "foreWeapon",
  group: "foreWeapons",
  label: "Fore 2",
  index: 1,
};

const hangar0: HullSlot = {
  id: "hangar-0",
  kind: "hangar",
  group: "hangars",
  label: "Hangar 1",
  index: 0,
};

const genericPet: LoadoutItem = {
  id: 30,
  name: "Hangar - To'Duj Fighters",
  type: "hangar bay",
  catalogKind: "item",
  who: null,
};

const universePet: LoadoutItem = {
  id: 31,
  name: "Hangar - Universe Colony Support Craft",
  type: "hangar bay",
  catalogKind: "item",
  who: "Universe Temporal Heavy Dreadnought Cruiser",
};

const obeliskShip = {
  name: "Obelisk Carrier",
  type: "Engineering Carrier",
  tier: 5,
};

describe("pickerCandidates", () => {
  it("keeps hull items that fit and have an open copy", () => {
    expect(
      fittingItems({
        kind: "foreWeapon",
        catalog: [phaser, uni],
        seated: [],
        collectedOnly: false,
        ownedKeys: new Set(),
      }).map((item) => item.id),
    ).toEqual([1]);
    expect(
      fittingItems({
        kind: "foreWeapon",
        catalog: [phaser],
        seated: [{ slotId: "foreWeapon-0", itemId: 1, catalogKind: "item" }],
        collectedOnly: true,
        ownedKeys: new Set(["item:1"]),
        exceptSlotId: "foreWeapon-1",
      }).map((item) => item.id),
    ).toEqual([1]);
  });

  it("expands Jam Targeting Sensors I and II for the matching BOff ranks", () => {
    const stations = buildBoffStations("Commander Science", {});
    const ensign = defined(defined(stations[0]).slots[0]);
    const lieutenant = defined(defined(stations[0]).slots[1]);
    expect(
      fittingBoffPowers({
        slot: ensign,
        stations,
        catalog: [jam, phaser],
      }).map((row) => row.abilityRank),
    ).toEqual([0]);
    expect(
      fittingBoffPowers({
        slot: lieutenant,
        stations,
        catalog: [jam],
      }).map((row) => row.abilityRank),
    ).toEqual([1]);
  });

  it("filters captain traits by slot group and identity", () => {
    const slot = defined(
      buildCaptainTraitSlots({ faction: "fed", race: "human" }).find(
        (row) => row.group === "personalSpace",
      ),
    );
    expect(
      fittingCaptainTraits({
        slot,
        catalog: [barrage, phaser],
        seated: [],
        collectedOnly: false,
        ownedKeys: new Set(),
        identity: { career: "tactical", raceLabel: "Human" },
      }).map((item) => item.id),
    ).toEqual([21]);
  });

  it("ranks hull picker candidates by the previous same-kind fill", () => {
    const ranked = pickerCandidatesFor({
      query: "",
      hullSlot: fore1,
      catalog: [phaser, disruptor],
      stations: [],
      hullSlots: [fore0, fore1],
      hullFills: [{ slotId: "foreWeapon-0", itemId: 2, catalogKind: "item" }],
      seated: [{ slotId: "foreWeapon-0", itemId: 2, catalogKind: "item" }],
      collectedOnly: false,
      ownedKeys: new Set(),
      identity: {},
    });
    expect(ranked.map((item) => item.id)).toEqual([2, 1]);
  });

  it("matches BOff picker search against the ranked display name", () => {
    const stations = buildBoffStations("Commander Science", {});
    const ensign = defined(defined(stations[0]).slots[0]);
    const hits = pickerCandidatesFor({
      query: "jam targeting sensors i",
      boffSlot: ensign,
      catalog: [jam],
      stations,
      hullSlots: [],
      hullFills: [],
      seated: [],
      collectedOnly: false,
      ownedKeys: new Set(),
      identity: {},
    });
    expect(hits.map((item) => item.name)).toEqual(["Jam Targeting Sensors I"]);
  });

  it("matches hull picker search against body copy", () => {
    const hits = pickerCandidatesFor({
      query: "kinetic",
      hullSlot: fore0,
      catalog: [phaser, disruptor],
      stations: [],
      hullSlots: [fore0],
      hullFills: [],
      seated: [],
      collectedOnly: false,
      ownedKeys: new Set(),
      identity: {},
    });
    expect(hits.map((item) => item.id)).toEqual([2]);
  });

  it("hides hangar pets whose who does not fit the hull", () => {
    expect(
      fittingItems({
        kind: "hangar",
        catalog: [genericPet, universePet, phaser],
        seated: [],
        collectedOnly: false,
        ownedKeys: new Set(),
        ship: obeliskShip,
      }).map((item) => item.id),
    ).toEqual([30]);
    expect(
      pickerCandidatesFor({
        query: "",
        hullSlot: hangar0,
        catalog: [genericPet, universePet],
        stations: [],
        hullSlots: [hangar0],
        hullFills: [],
        seated: [],
        collectedOnly: false,
        ownedKeys: new Set(),
        identity: {},
        ship: {
          name: "Universe Temporal Heavy Dreadnought Cruiser",
          type: "Heavy Dreadnought Cruiser",
          tier: 6,
        },
      }).map((item) => item.id),
    ).toEqual([30, 31]);
  });
});
