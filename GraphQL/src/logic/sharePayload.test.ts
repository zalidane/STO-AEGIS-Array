import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contentHashFromPayload,
  fillCount,
  fillsFromPayload,
  isEligibleForPublic,
  isPublicListRateLimited,
  parseSharePayload,
  pickFeaturedBuildId,
  SHARE_SCHEMA_VERSION,
  wasFeaturedRecently,
  type SharePayload,
} from "./sharePayload.js";

const payload: SharePayload = {
  v: SHARE_SCHEMA_VERSION,
  shipName: "Advanced Heavy Cruiser (T6)",
  title: "Energy 1",
  slots: [
    {
      slotId: "foreWeapon-1",
      catalogKind: "item",
      name: "Phaser Dual Cannons",
      type: "ship fore weapon",
      quality: "epic",
      mark: "XV",
    },
    {
      slotId: "tacticalConsole-1",
      catalogKind: "item",
      name: "Vulnerability Locator",
      type: "ship tactical console",
    },
  ],
};

describe("parseSharePayload", () => {
  it("accepts a versioned name-keyed snapshot", () => {
    const parsed = parseSharePayload(payload);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.payload.shipName, payload.shipName);
    assert.equal(parsed.payload.slots.length, 2);
  });

  it("rejects infobox-id shaped slots and duplicate slot ids", () => {
    assert.equal(parseSharePayload({ v: 1, shipName: "X", title: "A" }).ok, false);
    assert.equal(
      parseSharePayload({
        ...payload,
        slots: [
          payload.slots[0],
          { ...payload.slots[0], name: "Other" },
        ],
      }).ok,
      false,
    );
    assert.equal(
      parseSharePayload({
        ...payload,
        slots: [{ slotId: "foreWeapon-1", catalogKind: "item", itemId: 44 }],
      }).ok,
      false,
    );
  });
});

describe("contentHashFromPayload", () => {
  it("ignores title and slot order", () => {
    const reversed: SharePayload = {
      ...payload,
      title: "A different name",
      slots: [...payload.slots].reverse(),
    };
    assert.equal(contentHashFromPayload(payload), contentHashFromPayload(reversed));
  });

  it("changes when seated gear changes", () => {
    const next: SharePayload = {
      ...payload,
      slots: [payload.slots[0]!],
    };
    assert.notEqual(contentHashFromPayload(payload), contentHashFromPayload(next));
  });
});

describe("fillsFromPayload", () => {
  it("dedupes the same wiki name on one board", () => {
    const clone: SharePayload = {
      ...payload,
      slots: [
        payload.slots[0]!,
        { ...payload.slots[0]!, slotId: "foreWeapon-2" },
      ],
    };
    const hash = contentHashFromPayload(clone);
    const fills = fillsFromPayload(clone, hash);
    assert.equal(fills.length, 1);
    assert.equal(fills[0]?.name, "Phaser Dual Cannons");
    assert.equal(fills[0]?.contentHash, hash);
  });
});

describe("public eligibility", () => {
  it("requires enough seated slots", () => {
    assert.equal(isEligibleForPublic(payload), false);
    assert.equal(fillCount(payload), 2);
    const stuffed: SharePayload = {
      ...payload,
      slots: Array.from({ length: 8 }, (_, i) => ({
        slotId: `foreWeapon-${i + 1}`,
        catalogKind: "item" as const,
        name: `Weapon ${i + 1}`,
      })),
    };
    assert.equal(isEligibleForPublic(stuffed), true);
  });
});

describe("Build of the Day pick", () => {
  it("returns the same id for everyone on a given UTC day", () => {
    const ids = ["b", "a", "c"];
    const day = new Date("2026-08-30T16:00:00.000Z");
    const later = new Date("2026-08-30T23:59:00.000Z");
    assert.equal(pickFeaturedBuildId(ids, day), pickFeaturedBuildId(ids, later));
  });

  it("excludes recently featured dates inside the cooldown", () => {
    const at = new Date("2026-08-30T12:00:00.000Z");
    assert.equal(wasFeaturedRecently(["2026-08-20"], at), true);
    assert.equal(wasFeaturedRecently(["2026-08-01"], at), false);
    assert.equal(wasFeaturedRecently(["2026-08-30"], at), false);
  });
});

describe("public listing rate limit", () => {
  it("caps listings from the same hashed IP in 24h", () => {
    const now = new Date("2026-08-30T12:00:00.000Z");
    const stamps = Array.from({ length: 10 }, (_, i) => {
      return new Date(now.getTime() - i * 60 * 60 * 1000);
    });
    assert.equal(isPublicListRateLimited(stamps, now), true);
    assert.equal(
      isPublicListRateLimited([new Date("2026-08-28T12:00:00.000Z")], now),
      false,
    );
  });
});
