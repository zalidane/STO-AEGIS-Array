import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractIncludedExperimentalWeapon } from "./shipequip";

const ACHILLES = `{{shiptypeinfo
| experimental = yes
| uniconsole = Console - Universal - Micro-Quantum Torpedoes Phalanx Array
}}
{{Experimental Weapon}}<br> <br>This vessel comes equipped with the {{item|Prototype Phaser Hexa Cannons}}.
{{shipequip
| mk = ∞
| fore1 = Phaser Beam Array
| heavy1 = Prototype Phaser Hexa Cannons
}}`;

describe("extractIncludedExperimentalWeapon", () => {
  it("reads heavy1 from {{shipequip}} on the Achilles page", () => {
    assert.equal(
      extractIncludedExperimentalWeapon(ACHILLES),
      "Prototype Phaser Hexa Cannons",
    );
  });

  it("falls back to {{item}} after {{Experimental Weapon}}", () => {
    assert.equal(
      extractIncludedExperimentalWeapon(
        "{{Experimental Weapon}}\nThis vessel comes equipped with the {{item|Prototype Phaser Hexa Cannons||epic}}.",
      ),
      "Prototype Phaser Hexa Cannons",
    );
  });

  it("returns null when the hull has a slot but no included weapon", () => {
    assert.equal(
      extractIncludedExperimentalWeapon(
        "{{shiptypeinfo|experimental = yes}}\n{{shipequip|fore1 = Phaser Beam Array}}",
      ),
      null,
    );
  });
});
