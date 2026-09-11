import { describe, expect, it } from "vitest";
import {
  itemMatchesMemberPattern,
  matchSetBonuses,
  parseSetMembers,
  shortSetPieceName,
} from "@/logic/loadout/setBonus";

const TEMPORAL_WHO = "Equippable on 31st Century Temporal Starships";

const chronotachyon = {
  name: "Console - Universal - Chronotachyon Capacitor",
  type: "Universal Console",
  who: TEMPORAL_WHO,
};

const stabilizer = {
  name: "Console - Universal - Tactical System Stabilizer",
  type: "Universal Console",
  who: TEMPORAL_WHO,
};

const causalAnchor = {
  name: "Console - Universal - Causal Anchor",
  type: "Universal Console",
  who: TEMPORAL_WHO,
};

const temporalCatalog = [chronotachyon, stabilizer, causalAnchor];

describe("parseSetMembers", () => {
  it("splits newline and semicolon lists", () => {
    expect(
      parseSetMembers("Heavy Bio-Molecular * Turret; Console - Tactical - Relay"),
    ).toEqual(["Heavy Bio-Molecular * Turret", "Console - Tactical - Relay"]);
  });
});

describe("itemMatchesMemberPattern", () => {
  it("strips Mk suffixes and expands * globs", () => {
    expect(
      itemMatchesMemberPattern(
        "Heavy Bio-Molecular Phaser Turret Mk XII",
        "Heavy Bio-Molecular * Turret",
      ),
    ).toBe(true);
    expect(
      itemMatchesMemberPattern(
        "Nausicaan Disruptor Beam Array",
        "Nausicaan Disruptor *",
      ),
    ).toBe(true);
    expect(
      itemMatchesMemberPattern(
        "Nausicaan Energy Lance",
        "Nausicaan Disruptor *",
      ),
    ).toBe(false);
  });
});

describe("shortSetPieceName", () => {
  it("drops console type prefixes and marks", () => {
    expect(
      shortSetPieceName("Console - Universal - Chronotachyon Capacitor"),
    ).toBe("Chronotachyon Capacitor");
    expect(
      shortSetPieceName("Temporal Defense Initiative Deflector Array Mk XII"),
    ).toBe("Temporal Defense Initiative Deflector Array");
  });
});

describe("matchSetBonuses inferred sets", () => {
  it("groups unique consoles that share a who restriction", () => {
    const active = matchSetBonuses(
      [chronotachyon, stabilizer],
      [],
      temporalCatalog,
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "31st Century Temporal Starships",
      equipped: 2,
      required: 3,
      complete: false,
      passives: null,
      missing: ["Console - Universal - Causal Anchor"],
    });
    expect(active[0]!.pieces).toEqual([
      chronotachyon.name,
      stabilizer.name,
    ]);
  });

  it("completes a two-piece unique-console set from catalog size", () => {
    const left = {
      name: "Console - Universal - Battle Module 4000",
      type: "Universal Console",
      who: "Any Ferengi Starship",
    };
    const right = {
      name: "Console - Universal - Metaphasic Solar Capacitor",
      type: "Universal Console",
      who: "Any Ferengi Starship",
    };
    const active = matchSetBonuses([left, right], [], [left, right]);
    expect(active[0]).toMatchObject({
      name: "Ferengi Starship",
      equipped: 2,
      required: 2,
      complete: true,
      missing: [],
    });
  });

  it("does not group unique consoles with empty or mismatched who", () => {
    expect(
      matchSetBonuses(
        [
          {
            name: "Console - Universal - Chronogami Displacer",
            type: "Universal Console",
            who: null,
          },
          {
            name: "Console - Universal - Cloaked Barrage",
            type: "Universal Console",
            who: null,
          },
        ],
        [],
      ),
    ).toEqual([]);

    expect(
      matchSetBonuses(
        [
          chronotachyon,
          {
            name: "Console - Universal - Cloaked Barrage",
            type: "Universal Console",
            who: "Any Scimitar variant",
          },
        ],
        [],
        temporalCatalog,
      ),
    ).toEqual([]);
  });

  it("infers named equipment sets from a shared name prefix", () => {
    const active = matchSetBonuses(
      [
        { name: "Temporal Defense Initiative Deflector Array Mk XII" },
        { name: "Temporal Defense Initiative Combat Impulse Engines Mk XII" },
      ],
      [],
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "Temporal Defense Initiative",
      equipped: 2,
      required: 3,
      complete: false,
    });
  });

  it("keeps cargo matches and does not duplicate them as a name prefix", () => {
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
      ],
    );
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe(9);
    expect(active[0]!.passives).toBe("+Hull");
  });

  it("matches cargo setPage when the bonus name is not in item names", () => {
    const active = matchSetBonuses(
      [
        { name: "Temporal Defense Initiative Deflector" },
        { name: "Temporal Defense Initiative Engine" },
      ],
      [
        {
          id: 1,
          name: "TDI 2-piece bonus",
          setPage: "Temporal Defense Initiative",
          reqItems: 3,
          passives: "+Hull",
        },
      ],
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "Temporal Defense Initiative",
      equipped: 2,
      required: 3,
      complete: false,
      passives: "+Hull",
    });
  });

  it("joins passives and procs for an unlocked cargo row", () => {
    const active = matchSetBonuses(
      [
        { name: "Assimilated Borg Technology Deflector" },
        { name: "Assimilated Borg Technology Engine" },
      ],
      [
        {
          id: 2,
          name: "Autonomous Regeneration Sequencer",
          setPage: "Assimilated Borg Technology",
          reqItems: 2,
          passives: "+Hull regen",
          procs: "2% chance on damage",
        },
      ],
    );
    expect(active[0]?.passives).toBe("+Hull regen\n2% chance on damage");
  });

  it("matches Nausicaan weapons and the siphon console via member globs (#13)", () => {
    const members =
      "Nausicaan Energy Torpedo Launcher\nNausicaan Disruptor *\nConsole - Science - Nausicaan Siphon Capacitor";
    const active = matchSetBonuses(
      [
        { name: "Nausicaan Energy Torpedo Launcher" },
        { name: "Nausicaan Disruptor Beam Array" },
        { name: "Console - Science - Nausicaan Siphon Capacitor" },
      ],
      [
        {
          id: 21,
          name: "Nausicaan Weaponry Augmentation (2)",
          setPage: "Nausicaan Weaponry Augmentation",
          reqItems: 2,
          passives: "On Hold: Disruptor DoT",
          members,
        },
        {
          id: 22,
          name: "Nausicaan Weaponry Augmentation (3)",
          setPage: "Nausicaan Weaponry Augmentation",
          reqItems: 3,
          passives: null,
          members,
        },
      ],
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "Nausicaan Weaponry Augmentation",
      equipped: 3,
      required: 3,
      complete: true,
      passives: "Nausicaan Weaponry Augmentation (2): On Hold: Disruptor DoT",
    });
    expect(active[0]!.pieces).toEqual([
      "Nausicaan Energy Torpedo Launcher",
      "Nausicaan Disruptor Beam Array",
      "Console - Science - Nausicaan Siphon Capacitor",
    ]);
  });

  it("shows the Nausicaan 2-piece bonus before the siphon console is seated", () => {
    const members =
      "Nausicaan Energy Torpedo Launcher\nNausicaan Disruptor *\nConsole - Science - Nausicaan Siphon Capacitor";
    const active = matchSetBonuses(
      [
        { name: "Nausicaan Energy Torpedo Launcher" },
        { name: "Nausicaan Disruptor Beam Array" },
      ],
      [
        {
          id: 21,
          name: "Nausicaan Weaponry Augmentation (2)",
          setPage: "Nausicaan Weaponry Augmentation",
          reqItems: 2,
          passives: "On Hold: Disruptor DoT",
          members,
        },
        {
          id: 22,
          name: "Nausicaan Weaponry Augmentation (3)",
          setPage: "Nausicaan Weaponry Augmentation",
          reqItems: 3,
          passives: null,
          members,
        },
      ],
    );
    expect(active[0]).toMatchObject({
      name: "Nausicaan Weaponry Augmentation",
      equipped: 2,
      required: 3,
      complete: false,
      passives: "Nausicaan Weaponry Augmentation (2): On Hold: Disruptor DoT",
    });
  });

  it("counts one Heavy Bio-Molecular turret plus the Counter-Command console (#13)", () => {
    const members =
      "Heavy Bio-Molecular * Turret\nEnhanced Bio-Molecular Photon Torpedo Launcher\nConsole - Universal - Hydrodynamics Compensator\nConsole - Tactical - Counter-Command Multi-Conduit Energy Relay";
    const active = matchSetBonuses(
      [
        { name: "Heavy Bio-Molecular Phaser Turret Mk XII" },
        { name: "Heavy Bio-Molecular Disruptor Turret Mk XII" },
        {
          name: "Console - Tactical - Counter-Command Multi-Conduit Energy Relay",
        },
      ],
      [
        {
          id: 31,
          name: "Bio-Molecular Instability",
          setPage: "Counter-Command Ordnance",
          reqItems: 2,
          passives: "+7.5% Bonus Energy Damage",
          members,
        },
        {
          id: 32,
          name: "Heavy Bio-Molecular Turret Barrage",
          setPage: "Counter-Command Ordnance",
          reqItems: 3,
          passives: null,
          procs: "Turret barrage",
          members,
        },
        {
          id: 33,
          name: "Degenerative Wave Signature",
          setPage: "Counter-Command Ordnance",
          reqItems: 4,
          passives: "1% hull-heal drain",
          members,
        },
      ],
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "Counter-Command Ordnance",
      equipped: 2,
      required: 4,
      complete: false,
      passives: "Bio-Molecular Instability: +7.5% Bonus Energy Damage",
    });
    expect(active[0]!.missing).toEqual([
      "Enhanced Bio-Molecular Photon Torpedo Launcher",
      "Console - Universal - Hydrodynamics Compensator",
    ]);
  });

  it("groups duplicate cargo rows for the same set page into one card", () => {
    const row = {
      name: "Autonomous Regeneration Sequencer",
      setPage: "Assimilated Borg Technology",
      reqItems: 2,
      passives: "+Hull regen",
    };
    const active = matchSetBonuses(
      [
        { name: "Assimilated Borg Technology Deflector" },
        { name: "Assimilated Borg Technology Engine" },
      ],
      [
        { id: 1, ...row },
        { id: 2, ...row },
      ],
    );
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      name: "Assimilated Borg Technology",
      equipped: 2,
      required: 2,
      complete: true,
      passives: "+Hull regen",
    });
  });
});
