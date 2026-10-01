import { describe, expect, it } from "vitest";
import { buildCaptainTraitSlots } from "@/logic/loadout/captainTraits";
import { buildBoffStations, boffSlotIds } from "@/logic/loadout/boffPowers";
import { buildHullSlots } from "@/logic/loadout/hullSlots";
import { loadoutSeatRatio } from "@/logic/loadout/seatRatio";
import type { CollectionLoadout, LoadoutSlotFill } from "@/logic/loadout/types";

const t6Cruiser = {
  tier: 6,
  boffs:
    "Lieutenant Commander Tactical,Commander Engineering-Intelligence,Lieutenant Science,Ensign Universal,Lieutenant Commander Universal-Command",
  devices: 2,
  tacticalSlots: 4,
  engineeringSlots: 5,
  scienceSlots: 2,
  foreWeapons: 5,
  aftWeapons: 3,
  hangars: 1,
};

function loadout(
  slots: LoadoutSlotFill[],
  extras: Partial<CollectionLoadout> = {},
): CollectionLoadout {
  return {
    id: "lo-1",
    characterId: "char-1",
    shipId: 1,
    name: "Build 1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    slots,
    ...extras,
  };
}

function fill(slotId: string, itemId = 1): LoadoutSlotFill {
  return { slotId, itemId };
}

describe("loadoutSeatRatio", () => {
  it("includes captain + BOff seats so filled never exceeds total", () => {
    const hull = buildHullSlots(t6Cruiser);
    const captain = buildCaptainTraitSlots({
      faction: "fed",
      race: "human",
      hullTraitSlots: hull.filter((slot) => slot.kind === "starshipTrait"),
    });
    const boffs = boffSlotIds(buildBoffStations(t6Cruiser.boffs, undefined));

    const hullOnly = hull.length;
    const combined =
      hull.filter((slot) => slot.kind !== "starshipTrait").length +
      captain.length +
      boffs.size;

    expect(combined).toBeGreaterThan(hullOnly);

    const seats = [
      ...hull.map((slot) => slot.id),
      ...captain.map((slot) => slot.id),
      ...boffs,
    ];
    const uniqueSeats = [...new Set(seats)];
    const ratio = loadoutSeatRatio({
      loadout: loadout(uniqueSeats.map((slotId, index) => fill(slotId, index + 1))),
      ship: t6Cruiser,
      captain: { faction: "fed", race: "human" },
    });

    expect(ratio.total).toBe(combined);
    expect(ratio.filled).toBe(ratio.total);
    expect(ratio.filled).toBeLessThanOrEqual(ratio.total);
    // Reproduces the old list bug: hull-only denominator under-counts.
    expect(ratio.filled).toBeGreaterThan(hullOnly);
  });

  it("does not double-count ship-trait sockets shared by hull and captain", () => {
    const hull = buildHullSlots(t6Cruiser);
    const traitIds = hull
      .filter((slot) => slot.kind === "starshipTrait")
      .map((slot) => slot.id);
    expect(traitIds.length).toBeGreaterThan(0);

    const captain = buildCaptainTraitSlots({
      hullTraitSlots: hull.filter((slot) => slot.kind === "starshipTrait"),
    });
    const boffCount = boffSlotIds(
      buildBoffStations(t6Cruiser.boffs, undefined),
    ).size;
    const naiveSum = hull.length + captain.length + boffCount;
    const ratio = loadoutSeatRatio({
      loadout: loadout([]),
      ship: t6Cruiser,
    });

    expect(ratio.total).toBe(naiveSum - traitIds.length);
    expect(ratio.total).toBeLessThan(naiveSum);
  });

  it("counts only fills that map to open builder seats", () => {
    const ratio = loadoutSeatRatio({
      loadout: loadout([
        fill("foreWeapon-0"),
        fill("personalSpace-0"),
        fill("boff-0-ensign"),
        fill("ghost-slot"),
      ]),
      ship: t6Cruiser,
      captain: { faction: "fed", race: "human" },
    });

    expect(ratio.filled).toBe(3);
    expect(ratio.filled).toBeLessThanOrEqual(ratio.total);
  });

  it("returns total 0 when the ship catalog row is missing", () => {
    expect(
      loadoutSeatRatio({
        loadout: loadout([fill("foreWeapon-0")]),
        ship: null,
      }),
    ).toEqual({ filled: 1, total: 0 });
  });

  it("respects stock board prefs that hide unused extras", () => {
    const full = loadoutSeatRatio({
      loadout: loadout([]),
      ship: t6Cruiser,
    });
    const stock = loadoutSeatRatio({
      loadout: loadout([], { boardPrefs: { hullUpgrade: "stock" } }),
      ship: t6Cruiser,
    });

    expect(stock.total).toBeLessThan(full.total);
  });
});
