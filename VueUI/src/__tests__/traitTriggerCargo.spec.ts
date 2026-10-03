import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractTraitTriggers } from "@/logic/loadout/extractTraitTriggers";

type CargoTrait = {
  name?: string;
  short?: string | null;
  basic?: string | null;
  detailed?: string | null;
};

function cargoTraits(): CargoTrait[] {
  const path = resolve(
    import.meta.dirname,
    "../../../Extractor/output/StarshipTraits.json",
  );
  return JSON.parse(readFileSync(path, "utf8")) as CargoTrait[];
}

function personalTraits(): CargoTrait[] {
  const path = resolve(
    import.meta.dirname,
    "../../../Extractor/output/Traits.json",
  );
  const rows = JSON.parse(readFileSync(path, "utf8")) as Array<
    CargoTrait & { description?: string | null; "short description"?: string | null }
  >;
  return rows.map((row) => ({
    name: row.name,
    short: row["short description"],
    basic: row.description,
    detailed: null,
  }));
}

describe("personal trait cargo trigger scan", () => {
  const traits = personalTraits();

  it("does not treat a named EPtX list as the Emergency Power family", () => {
    const names = traits
      .filter((trait) =>
        extractTraitTriggers(trait).some(
          (trigger) =>
            trigger.kind === "abilityFamily" && trigger.family === "eptx",
        ),
      )
      .map((trait) => trait.name);
    expect(names).toEqual([]);
  });
});

describe("starship trait cargo trigger scan", () => {
  const traits = cargoTraits();

  it("only the Emergency Power family traits ask for any EPtX", () => {
    const names = traits
      .filter((trait) =>
        extractTraitTriggers(trait).some(
          (trigger) =>
            trigger.kind === "abilityFamily" && trigger.family === "eptx",
        ),
      )
      .map((trait) => trait.name);
    expect(names).toEqual([
      "Critical Systems",
      "Ship of the Line",
      "Surplus Supply",
    ]);
  });

  it("only Super Charged Weapons requires an energy weapon and a torpedo", () => {
    const names = traits
      .filter((trait) => {
        const triggers = extractTraitTriggers(trait);
        const classes = triggers
          .filter((trigger) => trigger.kind === "weaponClass")
          .flatMap((trigger) =>
            trigger.kind === "weaponClass" ? trigger.classes : [],
          );
        return classes.includes("energy") && classes.includes("torpedo");
      })
      .map((trait) => trait.name);
    expect(names).toEqual(["Super Charged Weapons"]);
  });

  it("Five Magicks is the only dealing-damage type trait, and it names Disruptor", () => {
    const named = traits
      .filter((trait) =>
        extractTraitTriggers(trait).some((trigger) => trigger.kind === "damageType"),
      )
      .map((trait) => trait.name);
    expect(named).toEqual(["Five Magicks"]);
    const five = traits.find((trait) => trait.name === "Five Magicks");
    const triggers = extractTraitTriggers(five);
    expect(triggers).toEqual([
      expect.objectContaining({
        kind: "damageType",
        damageTypes: expect.arrayContaining([
          "Fire",
          "Cold",
          "Electrical",
          "Radiation",
          "Psionic",
          "Disruptor",
        ]),
      }),
    ]);
    expect(triggers.some((trigger) => trigger.kind === "combatState")).toBe(
      false,
    );
  });
});
