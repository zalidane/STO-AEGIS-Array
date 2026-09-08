import { describe, expect, it } from "vitest";
import { buildCaptainTraitSlots } from "@/logic/loadout/captainTraits";
import type { BoffStation } from "@/logic/loadout/boffPowers";
import type { HullSlot } from "@/logic/loadout/hullSlots";
import type { CollectionLoadout, LoadoutItem } from "@/logic/loadout/types";
import {
  collapseModifierTokens,
  escapeRedditCell,
  exportRedditTemplate,
  formatRedditItemLine,
  redditOfficerTitle,
} from "@/logic/share/redditTemplate";

const hullSlots: HullSlot[] = [
  {
    id: "foreWeapon-0",
    kind: "foreWeapon",
    group: "foreWeapons",
    label: "Fore 1",
    index: 0,
  },
  {
    id: "foreWeapon-1",
    kind: "foreWeapon",
    group: "foreWeapons",
    label: "Fore 2",
    index: 1,
  },
  {
    id: "deflector",
    kind: "deflector",
    group: "deflector",
    label: "Deflector",
    index: 0,
  },
];

const stations: BoffStation[] = [
  {
    index: 0,
    raw: "Lieutenant Commander Science",
    seat: { rank: "Lieutenant Commander", career: "Science" },
    needsCareerChoice: false,
    careerChoice: "Science",
    slots: [
      {
        id: "boff-0-ensign",
        stationIndex: 0,
        rank: "ensign",
        rankLabel: "ENS",
      },
      {
        id: "boff-0-lieutenant",
        stationIndex: 0,
        rank: "lieutenant",
        rankLabel: "LT",
      },
      {
        id: "boff-0-ltcmdr",
        stationIndex: 0,
        rank: "lieutenant commander",
        rankLabel: "LTC",
      },
    ],
  },
];

const items: LoadoutItem[] = [
  {
    id: 11,
    name: "Phaser Dual Cannons",
    type: "ship fore weapon",
    catalogKind: "item",
  },
  {
    id: 7,
    name: "Jam Targeting Sensors",
    type: "Science",
    catalogKind: "traySkill",
    environment: "space",
    ranks: ["Ensign", "Lieutenant", "Lieutenant Commander"],
  },
  {
    id: 8,
    name: "Crippling Fire",
    type: "char",
    catalogKind: "trait",
    environment: "space",
  },
  {
    id: 20,
    name: "Angle On The Bow",
    type: "Starship Trait",
    catalogKind: "starshipTrait",
  },
];

const loadout: CollectionLoadout = {
  id: "local-1",
  characterId: "cap-1",
  shipId: 1,
  name: "Cannons 1",
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
  slots: [
    {
      slotId: "foreWeapon-0",
      itemId: 11,
      catalogKind: "item",
      mark: "XV",
      modifiers: ["[CrtD]", "[CrtD]", "[CrtD]", "[Pen]"],
    },
    {
      slotId: "boff-0-ensign",
      itemId: 7,
      catalogKind: "traySkill",
      abilityRank: 0,
    },
    {
      slotId: "boff-0-lieutenant",
      itemId: 7,
      catalogKind: "traySkill",
      abilityRank: 1,
    },
    {
      slotId: "starshipTrait-0",
      itemId: 20,
      catalogKind: "starshipTrait",
    },
    {
      slotId: "personalSpace-0",
      itemId: 8,
      catalogKind: "trait",
    },
  ],
};

describe("reddit template helpers", () => {
  it("collapses adjacent suffix tokens", () => {
    expect(collapseModifierTokens(["[CrtD]", "[CrtD]", "[CrtD]", "[Pen]"])).toBe(
      "[CrtD]x3 [Pen]",
    );
    expect(collapseModifierTokens(["[Dmg]", "[CrtH]", "[Dmg]"])).toBe(
      "[Dmg] [CrtH] [Dmg]",
    );
  });

  it("keeps pipes out of table cells", () => {
    expect(escapeRedditCell("A | B\nC")).toBe("A / B C");
  });

  it("formats seated hull items with mark and mods", () => {
    expect(
      formatRedditItemLine(
        items[0] ?? null,
        loadout.slots[0] ?? null,
        "foreWeapon",
      ),
    ).toBe("Phaser Dual Cannons Mk XV [CrtD]x3 [Pen]");
  });

  it("titles BOff stations the way the Reddit template does", () => {
    const station = stations[0];
    expect(station).toBeDefined();
    if (!station) return;
    expect(redditOfficerTitle(station)).toBe(
      "Officer 1: Lt. Commander ( Science )",
    );
  });
});

describe("exportRedditTemplate", () => {
  it("fills r/stobuilds loadout, BOff I+II, and trait tables", () => {
    const markdown = exportRedditTemplate({
      title: "Cannons 1",
      shipName: "Achilles Miracle Worker Heavy Destroyer",
      captain: {
        name: "Test Captain",
        career: "tactical",
        faction: "federation",
        race: "alien",
        primarySpecialization: "temporal",
        secondarySpecialization: "strategist",
      },
      loadout,
      items,
      hullSlots,
      captainSlots: buildCaptainTraitSlots({
        faction: "federation",
        race: "alien",
      }),
      boffStations: stations,
      setBonuses: [
        {
          name: "Terran Task Force",
          equipped: 2,
          required: 3,
          passives: "+5% Phaser Damage",
        },
      ],
    });

    expect(markdown).toContain("# Cannons 1");
    expect(markdown).toContain("Captain Career | Tactical");
    expect(markdown).toContain("Captain Faction | Federation");
    expect(markdown).toContain("Captain Race | Alien");
    expect(markdown).toContain("Primary Specialization | Temporal Operative");
    expect(markdown).toContain("Secondary Specialization | Strategist");
    expect(markdown).toContain("**Fore Weapons: 2**");
    expect(markdown).toContain("Phaser Dual Cannons Mk XV [CrtD]x3 [Pen]");
    expect(markdown).toContain("**Deflector**");
    expect(markdown).toContain(
      "| Officer 1: Lt. Commander ( Science ) | Jam Targeting Sensors I | |",
    );
    expect(markdown).toContain("| | Jam Targeting Sensors II | |");
    expect(markdown).toContain("Crippling Fire");
    expect(markdown).toContain("Angle On The Bow");
    expect(markdown).toContain("Terran Task Force | 2/3 | +5% Phaser Damage");
    expect(markdown).toContain("r/stobuilds");
  });
});
