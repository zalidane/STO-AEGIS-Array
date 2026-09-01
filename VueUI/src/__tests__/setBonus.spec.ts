import { describe, expect, it } from "vitest";
import { matchSetBonuses, shortSetPieceName } from "@/logic/loadout/setBonus";

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
});
