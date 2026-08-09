import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractWikiTargets } from "./parseRefs";
import {
  buildShipDisplayTitle,
  buildShipNameIdMap,
  preferShipForAlias,
} from "./shipNameLookup";

describe("buildShipDisplayTitle", () => {
  it("joins class + type for Resolute Advanced Heavy Cruiser", () => {
    assert.equal(
      buildShipDisplayTitle({
        displayPrefix: null,
        displayClass: "Resolute",
        displayType: "Advanced Heavy Cruiser",
      }),
      "Resolute Advanced Heavy Cruiser",
    );
  });

  it("includes Fleet prefix when present", () => {
    assert.equal(
      buildShipDisplayTitle({
        displayPrefix: "Fleet",
        displayClass: "Excelsior",
        displayType: "Advanced Heavy Cruiser",
      }),
      "Fleet Excelsior Advanced Heavy Cruiser",
    );
  });
});

describe("preferShipForAlias", () => {
  it("prefers non-Fleet over Fleet", () => {
    const base = {
      id: 1,
      name: "Heavy Strike Wing Escort (T6)",
      tier: 6,
    };
    const fleet = {
      id: 2,
      name: "Fleet Heavy Strike Wing Escort (T6)",
      tier: 6,
    };
    assert.equal(preferShipForAlias(fleet, base).id, 1);
  });

  it("prefers higher tier when both Fleet", () => {
    const t5 = { id: 1, name: "Fleet Mogh Battlecruiser (T5)", tier: 5 };
    const t6 = { id: 2, name: "Fleet Mogh Battlecruiser (T6)", tier: 6 };
    assert.equal(preferShipForAlias(t5, t6).id, 2);
  });
});

describe("buildShipNameIdMap + Improved Weaponized Emitters", () => {
  it("resolves Resolute Advanced Heavy Cruiser to Advanced Heavy Cruiser (T6)", () => {
    const map = buildShipNameIdMap([
      {
        id: 10,
        name: "Advanced Heavy Cruiser",
        displayClass: "Excelsior",
        displayType: "Advanced Heavy Cruiser",
        tier: 3,
      },
      {
        id: 20,
        name: "Advanced Heavy Cruiser (T6)",
        displayClass: "Resolute",
        displayType: "Advanced Heavy Cruiser",
        tier: 6,
      },
      {
        id: 30,
        name: "Legendary Excelsior Miracle Worker Heavy Cruiser",
        displayPrefix: "Legendary",
        displayClass: "Excelsior",
        displayType: "Miracle Worker Heavy Cruiser",
        tier: 6,
      },
    ]);

    const obtained =
      '*&lt;span title=&quot;Federation only&quot;&gt;[[File:Faction Federation.png|16px|link=Starfleet-only]]&lt;/span&gt; [[Resolute Advanced Heavy Cruiser]] &amp; [[Legendary Excelsior Miracle Worker Heavy Cruiser]]';

    const targets = extractWikiTargets(obtained);
    assert.deepEqual(targets, [
      "Resolute Advanced Heavy Cruiser",
      "Legendary Excelsior Miracle Worker Heavy Cruiser",
    ]);
    assert.equal(map.get("Resolute Advanced Heavy Cruiser"), 20);
    assert.equal(
      map.get("Legendary Excelsior Miracle Worker Heavy Cruiser"),
      30,
    );
  });
});
