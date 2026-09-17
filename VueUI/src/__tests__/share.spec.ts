import { describe, expect, it } from "vitest";
import { createCharacter } from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
} from "@/logic/collection/types";
import { importSharedLoadout } from "@/logic/loadout/state";
import { copyShareToCaptain } from "@/logic/share/copyToCaptain";
import {
  encodeSharePayload,
  MIN_PUBLIC_FILLS,
  resolveShareSlots,
  SHARE_SCHEMA_VERSION,
  type SharePayload,
} from "@/logic/share/payload";
import {
  hydrateShareRecords,
  recordForLoadout,
  sharedBuildUrl,
  upsertShareRecord,
} from "@/logic/share/records";
import { publicUsageLabel } from "@/logic/share/usage";
import {
  sharedBoffStationRows,
  sharedCaptainTraitSections,
} from "@/logic/share/sharedBoard";
import type { CollectionLoadout, LoadoutItem } from "@/logic/loadout/types";

const clock: CollectionClock = {
  now: () => "2026-08-30T12:00:00.000Z",
  id: () => {
    clockIds += 1;
    return `share-${clockIds}`;
  },
};

let clockIds = 0;

const items: LoadoutItem[] = [
  { id: 11, name: "Phaser Dual Cannons", type: "ship fore weapon", catalogKind: "item" },
  { id: 12, name: "Vulnerability Locator", type: "ship tactical console", catalogKind: "item" },
  {
    id: 20,
    name: "Improved Critical",
    type: "Starship Trait",
    catalogKind: "starshipTrait",
  },
];

const loadout: CollectionLoadout = {
  id: "local-1",
  characterId: "cap-1",
  shipId: 7,
  name: "Energy 1",
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:00:00.000Z",
  slots: [
    {
      slotId: "foreWeapon-1",
      itemId: 11,
      catalogKind: "item",
      quality: "epic",
      mark: "XV",
      modifiers: ["[Dmg]", "[CrtH]", "[Pen]"],
    },
    { slotId: "tacticalConsole-1", itemId: 12, catalogKind: "item" },
    { slotId: "starshipTrait-1", itemId: 20, catalogKind: "starshipTrait" },
  ],
};

describe("encodeSharePayload", () => {
  it("includes tray skills and seat careers for BOff powers", () => {
    const withBoff: CollectionLoadout = {
      ...loadout,
      boffSeatCareers: { "0": "Tactical" },
      slots: [
        ...loadout.slots,
        {
          slotId: "boff-0-commander",
          itemId: 30,
          catalogKind: "traySkill",
          abilityRank: 2,
        },
      ],
    };
    const catalog = [
      ...items,
      {
        id: 30,
        name: "Tactical Team",
        type: "Tactical",
        catalogKind: "traySkill" as const,
      },
    ];
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout: withBoff,
      items: catalog,
    });
    expect(payload.boffSeatCareers).toEqual({ "0": "Tactical" });
    expect(
      payload.slots.some(
        (slot) =>
          slot.catalogKind === "traySkill" && slot.name === "Tactical Team",
      ),
    ).toBe(true);
    expect(payload.slots.find((s) => s.catalogKind === "traySkill")?.abilityRank).toBe(
      2,
    );
  });

  it("keys fills by wiki name, not catalog id", () => {
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout,
      items,
    });
    expect(payload.v).toBe(SHARE_SCHEMA_VERSION);
    expect(payload.slots.map((slot) => slot.name)).toEqual([
      "Phaser Dual Cannons",
      "Vulnerability Locator",
      "Improved Critical",
    ]);
    expect(JSON.stringify(payload)).not.toContain("itemId");
    expect(payload.slots[0]?.quality).toBe("epic");
    expect(payload.slots[0]?.modifiers).toEqual(["[Dmg]", "[CrtH]", "[Pen]"]);
  });

  it("includes personal trait seats on the loadout (#16)", () => {
    const withTrait: CollectionLoadout = {
      ...loadout,
      slots: [
        ...loadout.slots,
        { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
        { slotId: "captainStarship-0", itemId: 20, catalogKind: "starshipTrait" },
      ],
    };
    const catalog = [
      ...items,
      {
        id: 8,
        name: "Crippling Fire",
        type: "char",
        catalogKind: "trait" as const,
      },
    ];
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout: withTrait,
      items: catalog,
    });
    expect(payload.slots.some((slot) => slot.catalogKind === "trait")).toBe(
      true,
    );
    expect(payload.slots.map((slot) => slot.name)).toContain("Crippling Fire");
    expect(
      payload.slots.some(
        (slot) =>
          slot.slotId === "captainStarship-0" &&
          slot.catalogKind === "starshipTrait",
      ),
    ).toBe(true);
  });

  it("includes non-default board prefs without dropping trait seats (#17)", () => {
    const withPrefs: CollectionLoadout = {
      ...loadout,
      boardPrefs: { hullUpgrade: "stock", hideModifiers: true },
      slots: [
        ...loadout.slots,
        { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
      ],
    };
    const catalog = [
      ...items,
      {
        id: 8,
        name: "Crippling Fire",
        type: "char",
        catalogKind: "trait" as const,
      },
    ];
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout: withPrefs,
      items: catalog,
    });
    expect(payload.boardPrefs).toEqual({
      hullUpgrade: "stock",
      hideModifiers: true,
    });
    expect(payload.slots.some((slot) => slot.catalogKind === "trait")).toBe(
      true,
    );
  });

  it("keeps tray-skill roman rank when II and III share an officer rank", () => {
    const payload = encodeSharePayload({
      shipName: "Atlantis Temporal Destroyer",
      title: "Shear",
      loadout: {
        ...loadout,
        slots: [
          {
            slotId: "boff-0-commander",
            itemId: 30,
            catalogKind: "traySkill",
            abilityRank: 2,
          },
        ],
      },
      items: [
        {
          id: 30,
          name: "Recursive Shearing",
          type: "Temporal Operative",
          catalogKind: "traySkill",
        },
      ],
    });
    expect(payload.slots[0]?.abilityRank).toBe(2);
    const resolved = resolveShareSlots(payload, [
      {
        id: 99,
        name: "Recursive Shearing",
        type: "Temporal Operative",
        catalogKind: "traySkill",
      },
    ]);
    expect(resolved.slots[0]?.abilityRank).toBe(2);
  });
});

describe("resolveShareSlots", () => {
  it("maps names back to current catalog ids", () => {
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout,
      items,
    });
    const moved: LoadoutItem[] = items.map((item) => ({
      ...item,
      id: item.id + 1000,
    }));
    const resolved = resolveShareSlots(payload, moved);
    expect(resolved.unresolved).toEqual([]);
    expect(resolved.slots.map((fill) => fill.itemId)).toEqual([1011, 1012, 1020]);
    expect(resolved.slots[0]?.modifiers).toEqual(["[Dmg]", "[CrtH]", "[Pen]"]);
  });
});

describe("copyShareToCaptain", () => {
  it("writes a new local UUID and leaves the published code unused", () => {
    clockIds = 0;
    const state = createCharacter(createEmptyCollectionState(), "Alice", clock);
    const payload: SharePayload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout,
      items,
    });
    const result = copyShareToCaptain(
      state,
      {
        payload,
        items,
        ships: [{ id: 7, wikiName: "Advanced Heavy Cruiser (T6)" }],
      },
      clock,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.loadout.id).toBe("share-2");
    expect(result.loadout.id).not.toBe(loadout.id);
    expect(result.loadout.slots).toHaveLength(3);
  });

  it("restores board prefs onto the copied loadout", () => {
    clockIds = 0;
    const state = createCharacter(createEmptyCollectionState(), "Alice", clock);
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout: { ...loadout, boardPrefs: { hullUpgrade: "stock" } },
      items,
    });
    const result = copyShareToCaptain(
      state,
      {
        payload,
        items,
        ships: [{ id: 7, wikiName: "Advanced Heavy Cruiser (T6)" }],
      },
      clock,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.loadout.boardPrefs).toEqual({ hullUpgrade: "stock" });
  });

  it("copies personal traits and tray skills onto the new loadout", () => {
    clockIds = 0;
    const state = createCharacter(createEmptyCollectionState(), "Alice", clock);
    const catalog: LoadoutItem[] = [
      ...items,
      {
        id: 8,
        name: "Crippling Fire",
        type: "char",
        catalogKind: "trait",
      },
      {
        id: 30,
        name: "Tactical Team",
        type: "Tactical",
        catalogKind: "traySkill",
      },
    ];
    const payload = encodeSharePayload({
      shipName: "Advanced Heavy Cruiser (T6)",
      title: "Energy 1",
      loadout: {
        ...loadout,
        boffSeatCareers: { "0": "Tactical" },
        slots: [
          ...loadout.slots,
          { slotId: "personalSpace-0", itemId: 8, catalogKind: "trait" },
          {
            slotId: "boff-0-ensign",
            itemId: 30,
            catalogKind: "traySkill",
            abilityRank: 0,
          },
        ],
      },
      items: catalog,
    });
    const result = copyShareToCaptain(
      state,
      {
        payload,
        items: catalog,
        ships: [{ id: 7, wikiName: "Advanced Heavy Cruiser (T6)" }],
      },
      clock,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unresolved).toEqual([]);
    expect(result.loadout.boffSeatCareers).toEqual({ "0": "Tactical" });
    expect(
      result.loadout.slots.some(
        (fill) => fill.slotId === "personalSpace-0" && fill.catalogKind === "trait",
      ),
    ).toBe(true);
    expect(
      result.loadout.slots.some(
        (fill) => fill.slotId === "boff-0-ensign" && fill.catalogKind === "traySkill",
      ),
    ).toBe(true);
  });

  it("fails without a captain or an unknown wiki hull", () => {
    const result = copyShareToCaptain(createEmptyCollectionState(), {
      payload: encodeSharePayload({
        shipName: "Missing",
        title: "X",
        loadout,
        items,
      }),
      items,
      ships: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("no-character");
  });
});

describe("importSharedLoadout", () => {
  it("does not reuse the source loadout id", () => {
    clockIds = 0;
    const state = createCharacter(createEmptyCollectionState(), "Alice", clock);
    const next = importSharedLoadout(
      state,
      { shipId: 7, name: "Copy", slots: loadout.slots },
      clock,
    );
    expect(next.loadouts[0]?.id).toBe("share-2");
    expect(next.loadouts[0]?.slots).toHaveLength(3);
  });
});

describe("share records", () => {
  it("stores the edit token locally against the loadout", () => {
    const records = upsertShareRecord([], {
      loadoutId: "local-1",
      publicCode: "ab3d4efg",
      editToken: "secret",
      visibility: "unlisted",
      updatedAt: "2026-08-30T12:00:00.000Z",
    });
    expect(recordForLoadout(records, "local-1")?.publicCode).toBe("ab3d4efg");
    expect(sharedBuildUrl("ab3d4efg", "https://aegis.example")).toBe(
      "https://aegis.example/b/ab3d4efg",
    );
    expect(hydrateShareRecords(records)).toHaveLength(1);
    expect(hydrateShareRecords({ nope: true })).toEqual([]);
  });
});

describe("public usage label", () => {
  it("counts distinct public boards, not views", () => {
    expect(publicUsageLabel(0)).toBe("");
    expect(publicUsageLabel(1)).toBe("Used in 1 public build");
    expect(publicUsageLabel(8)).toBe("Used in 8 public builds");
    expect(MIN_PUBLIC_FILLS).toBe(8);
  });
});

describe("shared board views", () => {
  it("surfaces captain trait fills for the shared page", () => {
    const trait: LoadoutItem = {
      id: 8,
      name: "Crippling Fire",
      type: "char",
      catalogKind: "trait",
      image: "/traits/crippling.png",
    };
    const starship: LoadoutItem = {
      id: 3,
      name: "A Call to Arms",
      type: "starship trait",
      catalogKind: "starshipTrait",
    };
    const sections = sharedCaptainTraitSections({
      shipName: "Atlantis",
      itemInSlot: (slotId) => {
        if (slotId === "personalSpace-0") return trait;
        if (slotId === "captainStarship-0") return starship;
        return null;
      },
    });
    const personal = sections.find((section) => section.group === "personalSpace");
    expect(personal?.slots[0]?.item?.name).toBe("Crippling Fire");
    const captainStarship = sections.find((section) => section.group === "starship");
    expect(captainStarship?.slots[0]?.slot.id).toBe("captainStarship-0");
    expect(captainStarship?.slots[0]?.item?.name).toBe("A Call to Arms");
    const shipSpecific = sections.find(
      (section) => section.group === "shipSpecific",
    );
    expect(shipSpecific?.label).toBe("Atlantis Traits");
  });

  it("surfaces BOff power fills with roman ability ranks", () => {
    const power: LoadoutItem = {
      id: 30,
      name: "Recursive Shearing",
      type: "Temporal Operative",
      catalogKind: "traySkill",
      ranks: [null, "Commander", "Commander", null, null],
    };
    const rows = sharedBoffStationRows({
      boffs: "Commander Science-Temporal Operative",
      fills: [
        {
          slotId: "boff-0-commander",
          itemId: 30,
          catalogKind: "traySkill",
          abilityRank: 2,
        },
      ],
      itemInSlot: (slotId) => (slotId === "boff-0-commander" ? power : null),
    });
    expect(rows).toHaveLength(1);
    const commander = rows[0]?.slots.find((s) => s.slot.id === "boff-0-commander");
    expect(commander?.item?.name).toBe("Recursive Shearing III");
  });
});
