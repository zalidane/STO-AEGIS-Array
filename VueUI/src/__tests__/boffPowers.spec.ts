import { describe, expect, it } from "vitest";
import { createCharacter } from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
  type CollectionState,
} from "@/logic/collection/types";
import {
  abilityRanksForSeat,
  boffPowerDisplayName,
  boffRankAbbrev,
  buildBoffStations,
  canonicalOfficerRank,
  matchingPowerRankIndex,
  matchingPowerRankIndexes,
  powerFitsBoffSlot,
  type BoffPowerSource,
} from "@/logic/loadout/boffPowers";
import {
  equipBoffPowerSlot,
  setBoffSeatCareer,
} from "@/logic/loadout/boffPowerState";
import { applyLoadout, createLoadout } from "@/logic/loadout/state";

const clock: CollectionClock = {
  now: () => "2026-09-01T12:00:00.000Z",
  id: () => {
    clockIds += 1;
    return `boff-${clockIds}`;
  },
};

let clockIds = 0;

function captainState(): CollectionState {
  clockIds = 0;
  return createCharacter(createEmptyCollectionState(), "Alice", clock);
}

const tacticalTeam: BoffPowerSource = {
  id: 1,
  name: "Tactical Team",
  type: "Tactical",
  region: "Space",
  ranks: ["Ensign", "Lieutenant", "Lieutenant Commander"],
};

const acetonBeam: BoffPowerSource = {
  id: 2,
  name: "Aceton Beam",
  type: "Engineering",
  region: "Space",
  ranks: ["Lt. Commander", "Commander", "Commander"],
};

const alignShields: BoffPowerSource = {
  id: 3,
  name: "Align Shield Frequencies",
  type: "Miracle Worker",
  region: "Space",
  ranks: ["Ensign", "Lieutenant", "Lieutenant Commander"],
};

const ambush: BoffPowerSource = {
  id: 4,
  name: "Ambush",
  type: "Tactical",
  region: "Ground",
  ranks: ["Commander", "[[Kit#Standard_3|Kit Module]]"],
};

const emergencyPower: BoffPowerSource = {
  id: 5,
  name: "Emergency Power to Weapons",
  type: "Engineering",
  region: "Space",
  ranks: ["Ensign", "Lieutenant", "Lieutenant Commander"],
};

const recursiveShearing: BoffPowerSource = {
  id: 6,
  name: "Recursive Shearing",
  type: "Temporal Operative",
  region: "Space",
  ranks: ["Lt Commander", "Commander", "Commander"],
};

describe("canonicalOfficerRank", () => {
  it("normalizes wiki rank spellings and ignores kit/captain ranks", () => {
    expect(canonicalOfficerRank("Lt. Commander")).toBe("lieutenant commander");
    expect(canonicalOfficerRank("Lt Commander")).toBe("lieutenant commander");
    expect(canonicalOfficerRank("[[Kit Module]]")).toBeNull();
    expect(canonicalOfficerRank("[[Captain ability|Captain Ability]]")).toBeNull();
  });
});

describe("abilityRanksForSeat", () => {
  it("fills Ensign through the seat’s own rank, lowest first", () => {
    expect(abilityRanksForSeat("Commander")).toEqual([
      "ensign",
      "lieutenant",
      "lieutenant commander",
      "commander",
    ]);
    expect(abilityRanksForSeat("Ensign")).toEqual(["ensign"]);
    expect(abilityRanksForSeat("Lieutenant Commander")).toEqual([
      "ensign",
      "lieutenant",
      "lieutenant commander",
    ]);
  });
});

describe("boff rank labels", () => {
  it("abbreviates seat and slot ranks as ens., lt, ltc, cdr", () => {
    const [commander] = buildBoffStations("Commander Tactical", {});
    expect(commander.slots.map((slot) => slot.rankLabel)).toEqual([
      "ens.",
      "lt",
      "ltc",
      "cdr",
    ]);
    expect(boffRankAbbrev("Ensign")).toBe("ens.");
    expect(boffRankAbbrev("Lieutenant")).toBe("lt");
    expect(boffRankAbbrev("Lieutenant Commander")).toBe("ltc");
    expect(boffRankAbbrev("Commander")).toBe("cdr");
  });
});

describe("powerFitsBoffSlot", () => {
  const stations = buildBoffStations(
    "Commander Tactical-Miracle Worker,Lieutenant Universal,Ensign Science",
    { "1": "Tactical" },
  );
  const tacCmdr = stations[0];
  const uniLt = stations[1];
  const sciEns = stations[2];

  it("matches rank, space region, and career or spec", () => {
    expect(
      powerFitsBoffSlot(tacticalTeam, tacCmdr.slots[0], tacCmdr),
    ).toBe(true);
    expect(
      powerFitsBoffSlot(acetonBeam, tacCmdr.slots[2], tacCmdr),
    ).toBe(false);
    expect(
      powerFitsBoffSlot(alignShields, tacCmdr.slots[0], tacCmdr),
    ).toBe(true);
    expect(powerFitsBoffSlot(ambush, tacCmdr.slots[3], tacCmdr)).toBe(false);
    expect(
      matchingPowerRankIndex(acetonBeam, "lieutenant commander"),
    ).toBe(0);
    expect(boffPowerDisplayName(acetonBeam, "lieutenant commander")).toBe(
      "Aceton Beam I",
    );
  });

  it("lets a chosen Universal career take that profession’s powers", () => {
    expect(powerFitsBoffSlot(tacticalTeam, uniLt.slots[0], uniLt)).toBe(true);
    expect(powerFitsBoffSlot(emergencyPower, uniLt.slots[0], uniLt)).toBe(
      false,
    );
  });

  it("keeps Science seats on Science powers", () => {
    expect(powerFitsBoffSlot(tacticalTeam, sciEns.slots[0], sciEns)).toBe(
      false,
    );
  });

  it("blocks career powers on Universal until a career is chosen", () => {
    const unset = buildBoffStations("Lieutenant Universal", {});
    expect(
      powerFitsBoffSlot(tacticalTeam, unset[0].slots[0], unset[0]),
    ).toBe(false);
  });

  it("lists Recursive Shearing II and III on a Commander Temporal seat", () => {
    const [temporal] = buildBoffStations(
      "Commander Science-Temporal Operative",
      {},
    );
    const commander = temporal.slots[3];
    expect(matchingPowerRankIndexes(recursiveShearing, "commander")).toEqual([
      1, 2,
    ]);
    expect(powerFitsBoffSlot(recursiveShearing, commander, temporal)).toBe(
      true,
    );
    expect(powerFitsBoffSlot(recursiveShearing, commander, temporal, 2)).toBe(
      true,
    );
    expect(boffPowerDisplayName(recursiveShearing, "commander")).toBe(
      "Recursive Shearing II",
    );
    expect(boffPowerDisplayName(recursiveShearing, "commander", 2)).toBe(
      "Recursive Shearing III",
    );
  });
});

describe("equipBoffPowerSlot", () => {
  it("seats a fitting power and rejects a duplicate on the same officer", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = state.loadouts[0];
    const stations = buildBoffStations("Commander Tactical", {});
    const context = { stations, powers: [tacticalTeam, emergencyPower] };

    const first = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stations[0].slots[0].id, itemId: 1 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = applyLoadout(state, first.loadout);

    const dup = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stations[0].slots[1].id, itemId: 1 },
      context,
      clock,
    );
    expect(dup).toEqual({ ok: false, reason: "equip-limit" });

    const other = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stations[0].slots[1].id, itemId: 5 },
      context,
      clock,
    );
    expect(other.ok).toBe(false);
  });

  it("allows the same power on two different officers", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = state.loadouts[0];
    const stations = buildBoffStations(
      "Lieutenant Tactical,Ensign Tactical",
      {},
    );
    const context = { stations, powers: [tacticalTeam] };

    const first = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stations[0].slots[0].id, itemId: 1 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = applyLoadout(state, first.loadout);

    const second = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stations[1].slots[0].id, itemId: 1 },
      context,
      clock,
    );
    expect(second.ok).toBe(true);
  });

  it("clears career powers when a Universal seat changes profession", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = state.loadouts[0];
    const stations = buildBoffStations("Commander Universal", { "0": "Tactical" });
    const context = { stations, powers: [tacticalTeam] };

    const seated = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stations[0].slots[0].id, itemId: 1 },
      context,
      clock,
    );
    expect(seated.ok).toBe(true);
    if (!seated.ok) return;
    state = applyLoadout(state, seated.loadout);

    state = setBoffSeatCareer(
      state,
      { loadoutId: loadout.id, stationIndex: 0, career: "Engineering" },
      {
        stations: buildBoffStations("Commander Universal", {
          "0": "Engineering",
        }),
        powers: [tacticalTeam],
      },
      clock,
    );
    expect(state.loadouts[0].slots).toEqual([]);
    expect(state.loadouts[0].boffSeatCareers).toEqual({ "0": "Engineering" });
  });

  it("seats Recursive Shearing III when II and III share Commander", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = state.loadouts[0];
    const stations = buildBoffStations(
      "Commander Science-Temporal Operative",
      {},
    );
    const context = { stations, powers: [recursiveShearing] };
    const commander = stations[0].slots[3];

    const seated = equipBoffPowerSlot(
      state,
      {
        loadoutId: loadout.id,
        slotId: commander.id,
        itemId: 6,
        abilityRank: 2,
      },
      context,
      clock,
    );
    expect(seated.ok).toBe(true);
    if (!seated.ok) return;
    expect(seated.loadout.slots).toEqual([
      {
        slotId: commander.id,
        itemId: 6,
        catalogKind: "traySkill",
        abilityRank: 2,
      },
    ]);
  });
});
