import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities.js";
import {
  expandStarshipTraitRanks,
  type StarshipTraitCargoRow,
} from "./expandStarshipTraitRanks.js";

function cargoRows(): StarshipTraitCargoRow[] {
  const candidates = [
    resolve("output/StarshipTraits.json"),
    resolve("Extractor/output/StarshipTraits.json"),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error("StarshipTraits.json not found");
  return JSON.parse(readFileSync(path, "utf8")) as StarshipTraitCargoRow[];
}

function text(value: unknown): string {
  return typeof value === "string" ? decodeHtmlEntities(value) : "";
}

function byName(
  rows: readonly StarshipTraitCargoRow[],
  name: string,
): StarshipTraitCargoRow {
  const matches = rows.filter((row) => text(row.name) === name);
  assert.equal(matches.length, 1, name);
  return matches[0]!;
}

describe("expandStarshipTraitRanks", () => {
  const cargo = cargoRows();
  const expanded = expandStarshipTraitRanks(cargo);

  it("adds an Improved and Superior row for each folded specialization family", () => {
    const names = expanded.map((row) => text(row.name));
    for (const name of [
      "Going the Extra Mile",
      "Improved Going the Extra Mile",
      "Superior Going the Extra Mile",
      "Command Frequency",
      "Improved Command Frequency",
      "Superior Command Frequency",
      "Non-Linear Progression",
      "Improved Non-Linear Progression",
      "Superior Non-Linear Progression",
      "Pedal to the Metal",
      "Improved Pedal to the Metal",
      "Superior Pedal to the Metal",
      "Predictive Algorithms",
      "Improved Predictive Algorithms",
      "Superior Predictive Algorithms",
      "Improved Arrest",
      "Improved Critical Systems",
      "Improved Demolition Teams",
      "Improved Hunter's Instinct",
      "Improved Temporal Insight",
      "Improved Unconventional Tactics",
    ]) {
      assert.equal(names.filter((entry) => entry === name).length, 1, name);
    }
    assert.equal(expanded.length, cargo.length + 16);
  });

  it("gives Going the Extra Mile the healing percent for that rank", () => {
    const base = text(byName(expanded, "Going the Extra Mile").detailed);
    const improved = text(
      byName(expanded, "Improved Going the Extra Mile").detailed,
    );
    const superior = text(
      byName(expanded, "Superior Going the Extra Mile").detailed,
    );

    assert.match(base, /\+10% increased Shield and Hull Healing/);
    assert.match(base, /\+10% Maximum Hit Points/);
    assert.doesNotMatch(base, /\+15%/);
    assert.doesNotMatch(base, /\+20%/);
    assert.doesNotMatch(base, /Improved\/Superior/);

    assert.match(improved, /\+15% increased Shield and Hull Healing/);
    assert.match(improved, /\+15% Maximum Hit Points/);
    assert.doesNotMatch(improved, /\+10%/);
    assert.doesNotMatch(improved, /\+20%/);

    assert.match(superior, /\+20% increased Shield and Hull Healing/);
    assert.match(superior, /\+20% Maximum Hit Points/);
    assert.doesNotMatch(superior, /\+10%/);
    assert.doesNotMatch(superior, /\+15%/);
  });

  it("keeps each Going the Extra Mile unlock on its own row", () => {
    const base = text(byName(expanded, "Going the Extra Mile").obtained);
    const improved = text(
      byName(expanded, "Improved Going the Extra Mile").obtained,
    );
    const superior = text(
      byName(expanded, "Superior Going the Extra Mile").obtained,
    );

    assert.match(base, /<u>Going the Extra Mile<\/u>/);
    assert.doesNotMatch(base, /<u>Improved Going the Extra Mile<\/u>/);
    assert.doesNotMatch(base, /<u>Superior Going the Extra Mile<\/u>/);

    assert.match(improved, /<u>Improved Going the Extra Mile<\/u>/);
    assert.match(improved, /30 points spent into the Miracle Worker/);
    assert.doesNotMatch(improved, /<u>Going the Extra Mile<\/u>/);
    assert.doesNotMatch(improved, /<u>Superior Going the Extra Mile<\/u>/);

    assert.match(superior, /<u>Superior Going the Extra Mile<\/u>/);
    assert.match(superior, /Temporal Agent/);
    assert.doesNotMatch(superior, /<u>Improved Going the Extra Mile<\/u>/);
  });

  it("splits Command Frequency cooldown and the Superior frigate", () => {
    const base = text(byName(expanded, "Command Frequency").detailed);
    const improved = text(byName(expanded, "Improved Command Frequency").detailed);
    const superior = text(byName(expanded, "Superior Command Frequency").detailed);

    assert.match(base, /Cooldown reduced by 5 minutes/);
    assert.match(base, /Removes "Low Health" restriction/);
    assert.doesNotMatch(base, /10 minutes/);
    assert.doesNotMatch(base, /Frigate/);

    assert.match(improved, /Cooldown reduced by 10 minutes/);
    assert.match(improved, /Removes "Low Health" restriction/);
    assert.doesNotMatch(improved, /5 minutes/);
    assert.doesNotMatch(improved, /Frigate/);

    assert.match(superior, /Cooldown reduced by 10 minutes/);
    assert.match(superior, /additional level 66 allied Frigate/);
    assert.doesNotMatch(superior, /5 minutes/);
  });

  it("splits the other specialization families onto their rank numbers", () => {
    const cases: Array<{ name: string; includes: string; excludes: string }> = [
      {
        name: "Predictive Algorithms",
        includes: "+2.5 Accuracy",
        excludes: "+5 Accuracy",
      },
      {
        name: "Improved Predictive Algorithms",
        includes: "+5 Accuracy",
        excludes: "+2.5 Accuracy",
      },
      {
        name: "Superior Predictive Algorithms",
        includes: "+7.5 Accuracy",
        excludes: "+2.5 Accuracy",
      },
      {
        name: "Pedal to the Metal",
        includes: "+1% All Damage Bonus",
        excludes: "+2%",
      },
      {
        name: "Improved Pedal to the Metal",
        includes: "max 10 stacks",
        excludes: "+30%",
      },
      {
        name: "Superior Pedal to the Metal",
        includes: "up to +30% max",
        excludes: "max 10 stacks",
      },
      {
        name: "Non-Linear Progression",
        includes: "Removes Power Drain from Reverse",
        excludes: "Captain Abilities",
      },
      {
        name: "Improved Non-Linear Progression",
        includes: "-0.2 seconds",
        excludes: "-0.33",
      },
      {
        name: "Superior Non-Linear Progression",
        includes: "-0.33 seconds",
        excludes: "-0.2",
      },
      { name: "Arrest", includes: "-25% Recharge Time", excludes: "-30%" },
      {
        name: "Improved Arrest",
        includes: "-30% Recharge Time",
        excludes: "-25%",
      },
      {
        name: "Critical Systems",
        includes: "+2% Critical Chance",
        excludes: "+3%",
      },
      {
        name: "Improved Critical Systems",
        includes: "+15% Critical Severity",
        excludes: "+10%",
      },
      {
        name: "Demolition Teams",
        includes: "Every 4 sec",
        excludes: "Every 2 sec",
      },
      {
        name: "Improved Demolition Teams",
        includes: "3 debuffs",
        excludes: "5 debuffs",
      },
      {
        name: "Hunter's Instinct",
        includes: "by 10% for 15 sec",
        excludes: "20%",
      },
      {
        name: "Improved Hunter's Instinct",
        includes: "by 20% for 15 sec",
        excludes: "10%",
      },
      {
        name: "Temporal Insight",
        includes: "Immunity to All Damage for 2 sec",
        excludes: "4 sec",
      },
      {
        name: "Improved Temporal Insight",
        includes: "Immunity to All Damage for 4 sec",
        excludes: "2 sec",
      },
      {
        name: "Unconventional Tactics",
        includes: "+15% Bonus All Damage",
        excludes: "+20%",
      },
      {
        name: "Improved Unconventional Tactics",
        includes: "+20% Bonus All Damage",
        excludes: "+15%",
      },
    ];

    for (const entry of cases) {
      const detailed = text(byName(expanded, entry.name).detailed);
      assert.match(detailed, new RegExp(escapeRegExp(entry.includes)), entry.name);
      assert.doesNotMatch(
        detailed,
        new RegExp(escapeRegExp(entry.excludes)),
        `${entry.name} should not include ${entry.excludes}`,
      );
    }

    assert.match(
      text(byName(expanded, "Improved Pedal to the Metal").detailed),
      /\+2% All Damage Bonus/,
    );
    assert.match(
      text(byName(expanded, "Superior Pedal to the Metal").detailed),
      /\+3% All Damage Bonus/,
    );
    assert.match(
      text(byName(expanded, "Improved Critical Systems").detailed),
      /for 15 sec/,
    );
    assert.match(
      text(byName(expanded, "Improved Demolition Teams").detailed),
      /for 8 sec/,
    );
    assert.match(
      text(byName(expanded, "Improved Arrest").detailed),
      /once every 30 seconds/,
    );
  });

  it("reuses the family icon and leaves short text in place", () => {
    const improved = byName(expanded, "Improved Going the Extra Mile");
    assert.equal(text(improved["icon name"]), "Going the Extra Mile");
    assert.equal(
      text(improved.short),
      text(byName(cargo, "Going the Extra Mile").short),
    );
    assert.equal(text(improved.type), "reward");
  });

  it("leaves base-only traits, including Superior-named ones, untouched", () => {
    const area = byName(cargo, "Superior Area Denial");
    const numerical = byName(cargo, "Numerical Superiority");
    const brace = byName(cargo, "Improved Brace for Impact");
    const cold = byName(cargo, "Cold-Hearted");
    assert.equal(expanded.includes(area), true);
    assert.equal(expanded.includes(numerical), true);
    assert.equal(expanded.includes(brace), true);
    assert.equal(expanded.includes(cold), true);
    assert.equal(
      expanded.filter((row) => text(row.name) === "Superior Area Denial").length,
      1,
    );
    assert.equal(
      expanded.filter((row) => text(row.name) === "Improved Brace for Impact")
        .length,
      1,
    );
  });

  it("does not invent a rank from prose that merely says Improved", () => {
    const prose = cargo.find((row) =>
      text(row.detailed).includes("Improved by Starship"),
    );
    assert.ok(prose);
    assert.equal(expanded.includes(prose), true);
  });

  it("does not duplicate a rank Cargo already published on its own", () => {
    const rows: StarshipTraitCargoRow[] = [
      {
        name: "Example",
        detailed: "Example/Improved\n* +1/+2 damage",
        obtained:
          "*<u>Example</u>: base\n*<u>Improved Example</u>: improved",
      },
      {
        name: "Improved Example",
        detailed: "already published",
        obtained: "ship mastery",
      },
    ];
    const merged = expandStarshipTraitRanks(rows);
    assert.equal(
      merged.filter((row) => row.name === "Improved Example").length,
      1,
    );
    assert.equal(
      merged.find((row) => row.name === "Improved Example")?.detailed,
      "already published",
    );
    assert.match(
      text(merged.find((row) => row.name === "Example")?.detailed),
      /\+1 damage/,
    );
  });

  it("is stable when run again on its own output", () => {
    const twice = expandStarshipTraitRanks(expanded);
    assert.deepEqual(
      twice.map((row) => text(row.name)),
      expanded.map((row) => text(row.name)),
    );
    assert.equal(
      text(byName(twice, "Superior Predictive Algorithms").detailed),
      text(byName(expanded, "Superior Predictive Algorithms").detailed),
    );
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
