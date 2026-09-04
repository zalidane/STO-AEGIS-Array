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
  type BoffStation,
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

function defined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("expected a defined value");
  return value;
}

function stationSlot(station: BoffStation, index: number) {
  return defined(station.slots[index]);
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

const jamTargetingSensors: BoffPowerSource = {
  id: 7,
  name: "Jam Targeting Sensors",
  type: "Science",
  region: "Space",
  ranks: ["Ensign", "Lieutenant", "Lieutenant Commander"],
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
  it("abbreviates seat and slot ranks as ENS, LT, LTC, CDR", () => {
    const commander = defined(buildBoffStations("Commander Tactical", {})[0]);
    expect(commander.slots.map((slot) => slot.rankLabel)).toEqual([
      "ENS",
      "LT",
      "LTC",
      "CDR",
    ]);
    expect(boffRankAbbrev("Ensign")).toBe("ENS");
    expect(boffRankAbbrev("Lieutenant")).toBe("LT");
    expect(boffRankAbbrev("Lieutenant Commander")).toBe("LTC");
    expect(boffRankAbbrev("Commander")).toBe("CDR");
  });
});

describe("powerFitsBoffSlot", () => {
  const stations = buildBoffStations(
    "Commander Tactical-Miracle Worker,Lieutenant Universal,Ensign Science",
    { "1": "Tactical" },
  );
  const tacCmdr = defined(stations[0]);
  const uniLt = defined(stations[1]);
  const sciEns = defined(stations[2]);

  it("matches rank, space region, and career or spec", () => {
    expect(
      powerFitsBoffSlot(tacticalTeam, stationSlot(tacCmdr, 0), tacCmdr),
    ).toBe(true);
    expect(
      powerFitsBoffSlot(acetonBeam, stationSlot(tacCmdr, 2), tacCmdr),
    ).toBe(false);
    expect(
      powerFitsBoffSlot(alignShields, stationSlot(tacCmdr, 0), tacCmdr),
    ).toBe(true);
    expect(powerFitsBoffSlot(ambush, stationSlot(tacCmdr, 3), tacCmdr)).toBe(
      false,
    );
    expect(
      matchingPowerRankIndex(acetonBeam, "lieutenant commander"),
    ).toBe(0);
    expect(boffPowerDisplayName(acetonBeam, "lieutenant commander")).toBe(
      "Aceton Beam I",
    );
  });

  it("lets a chosen Universal career take that profession’s powers", () => {
    expect(powerFitsBoffSlot(tacticalTeam, stationSlot(uniLt, 0), uniLt)).toBe(
      true,
    );
    expect(powerFitsBoffSlot(emergencyPower, stationSlot(uniLt, 0), uniLt)).toBe(
      false,
    );
  });

  it("keeps Science seats on Science powers", () => {
    expect(powerFitsBoffSlot(tacticalTeam, stationSlot(sciEns, 0), sciEns)).toBe(
      false,
    );
  });

  it("blocks career powers on Universal until a career is chosen", () => {
    const unset = defined(buildBoffStations("Lieutenant Universal", {})[0]);
    expect(
      powerFitsBoffSlot(tacticalTeam, stationSlot(unset, 0), unset),
    ).toBe(false);
  });

  it("lists Recursive Shearing II and III on a Commander Temporal seat", () => {
    const temporal = defined(
      buildBoffStations("Commander Science-Temporal Operative", {})[0],
    );
    const commander = stationSlot(temporal, 3);
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
  it("seats different ranks of the same power on one officer", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = defined(state.loadouts[0]);
    const station = defined(buildBoffStations("Commander Science", {})[0]);
    const context = {
      stations: [station],
      powers: [jamTargetingSensors, emergencyPower],
    };
    const ensign = stationSlot(station, 0);
    const lieutenant = stationSlot(station, 1);

    const first = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: ensign.id, itemId: 7 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = applyLoadout(state, first.loadout);

    const second = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: lieutenant.id, itemId: 7 },
      context,
      clock,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.loadout.slots).toEqual([
      { slotId: ensign.id, itemId: 7, catalogKind: "traySkill" },
      { slotId: lieutenant.id, itemId: 7, catalogKind: "traySkill" },
    ]);

    const mismatched = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stationSlot(station, 2).id, itemId: 5 },
      context,
      clock,
    );
    expect(mismatched).toEqual({ ok: false, reason: "illegal-slot" });
  });

  it("allows the same power on two different officers", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = defined(state.loadouts[0]);
    const stations = buildBoffStations(
      "Lieutenant Tactical,Ensign Tactical",
      {},
    );
    const firstStation = defined(stations[0]);
    const secondStation = defined(stations[1]);
    const context = { stations, powers: [tacticalTeam] };

    const first = equipBoffPowerSlot(
      state,
      { loadoutId: loadout.id, slotId: stationSlot(firstStation, 0).id, itemId: 1 },
      context,
      clock,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = applyLoadout(state, first.loadout);

    const second = equipBoffPowerSlot(
      state,
      {
        loadoutId: loadout.id,
        slotId: stationSlot(secondStation, 0).id,
        itemId: 1,
      },
      context,
      clock,
    );
    expect(second.ok).toBe(true);
  });

  it("clears career powers when a Universal seat changes profession", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = defined(state.loadouts[0]);
    const stations = buildBoffStations("Commander Universal", { "0": "Tactical" });
    const context = { stations, powers: [tacticalTeam] };

    const seated = equipBoffPowerSlot(
      state,
      {
        loadoutId: loadout.id,
        slotId: stationSlot(defined(stations[0]), 0).id,
        itemId: 1,
      },
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
    expect(defined(state.loadouts[0]).slots).toEqual([]);
    expect(defined(state.loadouts[0]).boffSeatCareers).toEqual({
      "0": "Engineering",
    });
  });

  it("seats Recursive Shearing III when II and III share Commander", () => {
    let state = createLoadout(captainState(), { shipId: 7 }, clock);
    const loadout = defined(state.loadouts[0]);
    const stations = buildBoffStations(
      "Commander Science-Temporal Operative",
      {},
    );
    const context = { stations, powers: [recursiveShearing] };
    const commander = stationSlot(defined(stations[0]), 3);

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
