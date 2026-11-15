import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { decodeHtmlEntities } from "./decodeHtmlEntities";
import { extractWikiTargets } from "./parseRefs";
import {
  buildShipDisplayTitle,
  buildShipNameIdMap,
  buildShipNameIndex,
  lookupShipId,
  preferShipForAlias,
  type ShipNameLookupRow,
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

describe("lookupShipId", () => {
  const denorios: ShipNameLookupRow = {
    id: 1,
    name: "Denorios Bajoran Interceptor",
    displayPrefix: "Bajoran",
    displayClass: "Denorios",
    displayType: "Interceptor",
    tier: 6,
  };
  const empersa: ShipNameLookupRow = {
    id: 2,
    name: "Empersa Alliance Miracle Worker Juggernaut",
    displayClass: "Empersa",
    displayType: "Alliance Miracle Worker Juggernaut",
    tier: 6,
  };
  const einstein: ShipNameLookupRow = {
    id: 3,
    name: "Kelvin Timeline Einstein Heavy Destroyer",
    displayPrefix: "Kelvin Timeline",
    displayClass: "Einstein",
    displayType: "Heavy Destroyer",
    tier: 6,
  };
  const d7: ShipNameLookupRow = {
    id: 4,
    name: "Kelvin Timeline D7 Heavy Destroyer",
    displayPrefix: "Kelvin Timeline",
    displayClass: "D7",
    displayType: "Heavy Destroyer",
    tier: 6,
  };
  const index = buildShipNameIndex([denorios, empersa, einstein, d7]);

  it("matches -class, word order, and a dropped Kelvin Timeline", () => {
    assert.equal(
      lookupShipId(index, "Denorios-class Bajoran Interceptor"),
      denorios.id,
    );
    assert.equal(
      lookupShipId(index, "Bajoran Denorios Interceptor"),
      denorios.id,
    );
    assert.equal(
      lookupShipId(index, "Empersa Miracle Worker Alliance Juggernaut"),
      empersa.id,
    );
    assert.equal(lookupShipId(index, "Kelvin Einstein Heavy Destroyer"), einstein.id);
    assert.equal(lookupShipId(index, "Kelvin D7 Heavy Destroyer"), d7.id);
  });

  it("does not match a shorter hull that only shares some words", () => {
    const withShort = buildShipNameIndex([
      denorios,
      {
        id: 9,
        name: "Denorios Interceptor",
        displayClass: "Denorios",
        displayType: "Interceptor",
        tier: 5,
      },
    ]);
    assert.equal(
      lookupShipId(withShort, "Denorios-class Bajoran Interceptor"),
      denorios.id,
    );
    assert.equal(lookupShipId(withShort, "Denorios Interceptor"), 9);
  });

  it("leaves same-word T5 and T6 hulls with different classes unmatched", () => {
    const carriers = buildShipNameIndex([
      {
        id: 5,
        name: "Jem'Hadar Dreadnought Carrier (T5)",
        displayClass: "Jem'Hadar T5",
        displayType: "Dreadnought Carrier",
        tier: 5,
      },
      {
        id: 6,
        name: "Jem'Hadar Dreadnought Carrier (T6)",
        displayClass: "Jem'Hadar T6",
        displayType: "Dreadnought Carrier",
        tier: 6,
      },
    ]);
    assert.equal(lookupShipId(carriers, "Jem'Hadar Dreadnought Carrier"), undefined);
    assert.equal(
      lookupShipId(carriers, "Jem'Hadar Dreadnought Carrier (T6)"),
      6,
    );
  });
});

describe("cargo wiki titles", () => {
  const ships = cargoShips();
  const traits = cargoTraits();
  const index = buildShipNameIndex(ships);
  const exact = buildShipNameIdMap(ships);
  const byId = new Map(ships.map((ship) => [ship.id, ship.name]));

  it("keeps every exact catalog or display-title hit on the same hull", () => {
    for (const trait of traits) {
      for (const target of extractWikiTargets(trait.obtained)) {
        const before = exact.get(target);
        if (before == null) continue;
        assert.equal(lookupShipId(index, target), before, target);
      }
    }
  });

  it("links the ship traits whose wiki titles differ from the catalog", () => {
    const expected: Record<string, string[]> = {
      "Harrying Maneuvers": ["Denorios Bajoran Interceptor"],
      "Hyper-Generative Repair Matrix": [
        "Empersa Alliance Miracle Worker Juggernaut",
      ],
      "Into the Fray": [
        "Kelvin Timeline Einstein Heavy Destroyer",
        "Kelvin Timeline D7 Heavy Destroyer",
      ],
      "Calm Before the Storm": ["Cardassian Ghemor Intel Flight Deck Carrier"],
      "Council of Thought": ["Xindi-Insectoid Olaen Heavy Strike Wing Escort"],
      Hivebearer: ["Hur'q Nekcrid Assembly Multi-Mission Science Vessel"],
      Reverberation: ["Amarie Smuggler's Heavy Escort"],
      "Heard I Needed Help": [
        "Legendary Kelvin Timeline Constitution Intel Battlecruiser",
      ],
      "Down But Not Out": [
        "Kelvin Timeline Constitution Heavy Command Cruiser",
        "Legendary Kelvin Timeline Constitution Intel Battlecruiser",
      ],
      "Radiant Nanite Cloud": ["Experimental Science Vessel"],
      "Relaunch and Repair": ["Vo'Devwl Support Carrier"],
      "Tachyon Dispersal": [
        "Sutherland Advanced Research Vessel",
        "Naj'sov Research Vessel",
        "Laeosa Research Warbird",
      ],
      "All Hands on Deck": [
        "Presidio Command Battlecruiser",
        "Ty'Gokor Tactical Command Battlecruiser",
        "Vastam Tactical Command Warbird",
      ],
      "Withering Barrage": ["Legendary B'rel Pilot Bird-of-Prey"],
      "Charged Particle Reaction": [
        "Gorn Ahgamas Multi-Mission Surveillance Vessel",
      ],
      "Exotic Particle Shielding": [
        "Gorn Ihgomas Multi-Mission Strategic Vessel",
      ],
      "Heavy Tachyon Mine": [
        "Gorn Khaimas Multi-Mission Reconnaissance Vessel",
      ],
      "Subsystem Redundancies": ["Nausicaan Kolasi Siege Destroyer"],
    };

    const newlyLinked: string[] = [];
    for (const trait of traits) {
      const traitName = decodeHtmlEntities(trait.name);
      for (const target of extractWikiTargets(trait.obtained)) {
        if (exact.get(target) != null) continue;
        const id = lookupShipId(index, target);
        if (id == null) continue;
        const shipName = byId.get(id);
        newlyLinked.push(`${traitName} -> ${shipName}`);
        const allowed = expected[traitName];
        assert.ok(allowed, `unexpected new link ${traitName} -> ${shipName}`);
        assert.ok(
          allowed.includes(shipName ?? ""),
          `${traitName} -> ${shipName}`,
        );
      }
    }
    assert.equal(newlyLinked.length, 22);

    for (const [traitName, shipNames] of Object.entries(expected)) {
      const trait = traits.find(
        (row) => decodeHtmlEntities(row.name) === traitName,
      );
      assert.ok(trait, traitName);
      const linked = extractWikiTargets(trait.obtained)
        .map((target) => lookupShipId(index, target))
        .filter((id): id is number => id != null)
        .map((id) => byId.get(id));
      for (const shipName of shipNames) {
        assert.ok(linked.includes(shipName), `${traitName} -> ${shipName}`);
      }
    }
  });

  it("does not treat factions, specializations, or lock boxes as ships", () => {
    for (const title of [
      "Federation",
      "KDF",
      "Dominion",
      "Pilot (specialization)",
      "Gamma Recruitment",
      "Infinity Prize Pack: Starship Trait",
      "Borg Lock Box",
    ]) {
      assert.equal(lookupShipId(index, title), undefined, title);
    }
  });
});

function cargoJson<T>(fileName: string): T {
  const path = [
    resolve("output", fileName),
    resolve("Extractor/output", fileName),
  ].find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`${fileName} not found`);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function cargoShips(): ShipNameLookupRow[] {
  const rows = cargoJson<
    Array<{
      name: string;
      displayprefix: string | null;
      displayclass: string | null;
      displaytype: string | null;
      tier: string | null;
    }>
  >("Ships.json");
  return rows.map((row, index) => ({
    id: index + 1,
    name: decodeHtmlEntities(row.name),
    displayPrefix: row.displayprefix
      ? decodeHtmlEntities(row.displayprefix)
      : null,
    displayClass: row.displayclass ? decodeHtmlEntities(row.displayclass) : null,
    displayType: row.displaytype ? decodeHtmlEntities(row.displaytype) : null,
    tier: row.tier ? Number(row.tier) : null,
  }));
}

function cargoTraits(): Array<{ name: string; obtained: string | null }> {
  return cargoJson("StarshipTraits.json");
}
