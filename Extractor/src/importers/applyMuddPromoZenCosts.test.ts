import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities.js";
import {
  applyMuddPromoZenCosts,
  MUDD_PROMO_ZEN_COST,
  MUDD_PROMO_ZEN_SHIP_NAMES,
} from "./applyMuddPromoZenCosts.js";

describe("applyMuddPromoZenCosts", () => {
  it("adds the Mudd's Zen price to R&D-only promo hulls", () => {
    const rows = applyMuddPromoZenCosts([
      { name: "Inquiry Battlecruiser", cost: "1;R&amp;D", tier: "6" },
      { name: "Sh&#039;vhal Temporal Science Spearhead", cost: "1;R&D" },
      { name: "Amarie Smuggler's Heavy Escort", cost: "1;R&D / 29500;Zen" },
      { name: "Shrike Intel Juggernaut", cost: "1;R&D" },
    ]);

    assert.equal(rows[0]?.cost, MUDD_PROMO_ZEN_COST);
    assert.equal(rows[0]?.tier, "6");
    assert.equal(rows[1]?.cost, MUDD_PROMO_ZEN_COST);
    assert.equal(rows[2]?.cost, "1;R&D / 29500;Zen");
    assert.equal(rows[3]?.cost, "1;R&D");
  });

  it("updates exactly the documented Mudd's promo hulls in Cargo", () => {
    const path = [
      resolve("output/Ships.json"),
      resolve("Extractor/output/Ships.json"),
    ].find((candidate) => existsSync(candidate));
    assert.ok(path, "Ships.json not found");
    const ships = JSON.parse(readFileSync(path, "utf8")) as Array<{
      name: string;
      cost: string | null;
    }>;
    const updated = applyMuddPromoZenCosts(ships);
    const changed = updated.filter((row, index) => row.cost !== ships[index]?.cost);

    assert.deepEqual(
      changed.map((row) => decodeHtmlEntities(String(row.name))).sort(),
      [...MUDD_PROMO_ZEN_SHIP_NAMES].sort(),
    );
    assert.ok(changed.every((row) => row.cost === MUDD_PROMO_ZEN_COST));
  });
});
