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
