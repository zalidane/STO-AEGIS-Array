import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { mapModifier, mapReputation, mapTrait } from "../mappers/cargoMappers.js";
import {
  catalogSupplementFingerprint,
  mergeCatalogSupplement,
  payloadsFromCatalogSupplementRows,
  type CatalogSupplementReader,
  type CatalogSupplementRow,
} from "./catalogSupplement.js";
import { importMappings } from "./importMappings.js";
import {
  mergeModifiers,
  type ModifierCargoRow,
  type ModifierSupplementRow,
} from "./mergeModifiers.js";
import {
  mergeReputation,
  type ReputationCargoRow,
  type ReputationSupplementRow,
} from "./mergeReputation.js";
import {
  mergeSetBonus,
  type SetBonusCargoRow,
  type SetBonusSupplementRow,
} from "./mergeSetBonus.js";
import {
  mergeTraits,
  type TraitCargoRow,
  type TraitSupplementRow,
} from "./mergeTraits.js";

const here = __dirname;
const cargoPath = resolve(here, "../../output/Modifiers.json");
const reputationCargoPath = resolve(here, "../../output/Reputation.json");
const setBonusCargoPath = resolve(here, "../../output/SetBonus.json");
const traitsCargoPath = resolve(here, "../../output/Traits.json");
const removedFiles = [
  resolve(here, "../../output/supplements/Modifiers.json"),
  resolve(here, "../../output/supplements/Reputation.json"),
  resolve(here, "../../output/supplements/SetBonus.json"),
  resolve(here, "../../output/supplements/Traits.json"),
];
const migrationPath = resolve(
  here,
  "../../../packages/database/prisma/migrations/20261003153000_add_catalog_supplement/migration.sql",
);
const leftoverMigrationPath = resolve(
  here,
  "../../../packages/database/prisma/migrations/20261004041500_seed_leftover_catalog_supplements/migration.sql",
);

const TRAIT_SUPPLEMENTS = [
  {
    name: "A Good Day to Die",
    type: "char",
    environment: "space",
    career: "tac",
  },
  {
    name: "Coordinated Targeting Solution",
    type: "char",
    environment: "space",
    career: "tac",
  },
  {
    name: "Fleet Tactician",
    type: "char",
    environment: "space",
    career: "tac",
  },
  {
    name: "Fleet Technician",
    type: "char",
    environment: "space",
    career: "eng",
  },
  {
    name: "Fleet Physicist",
    type: "char",
    environment: "space",
    career: "sci",
  },
  {
    name: "Nadion Bypass",
    type: "char",
    environment: "space",
    career: "eng",
  },
  {
    name: "Photonic Reinforcement",
    type: "char",
    environment: "space",
    career: "sci",
  },
  {
    name: "Subnucleonic Transferal",
    type: "char",
    environment: "space",
    career: "sci",
  },
  {
    name: "Tactical Vigilance",
    type: "char",
    environment: "ground",
    career: "tac",
  },
  {
    name: "Combined Assault",
    type: "char",
    environment: "ground",
    career: "tac",
  },
  {
    name: "Security Detail",
    type: "char",
    environment: "ground",
    career: "tac",
  },
  {
    name: "Orbital Devastation",
    type: "char",
    environment: "ground",
    career: "eng",
  },
  {
    name: "Assault Drone Fabrication",
    type: "char",
    environment: "ground",
    career: "eng",
  },
  {
    name: "Distributed Shield Rerouting",
    type: "char",
    environment: "ground",
    career: "eng",
  },
  {
    name: "Subspace Manipulator",
    type: "char",
    environment: "ground",
    career: "sci",
  },
  {
    name: "Nanoprobe Contagion",
    type: "char",
    environment: "ground",
    career: "sci",
  },
  {
    name: "Tricorder Analysis",
    type: "char",
    environment: "ground",
    career: "sci",
  },
];

function payloadsFromMigration(sql: string): unknown[] {
  return rowsFromMigration(sql).map((row) => row.payload);
}

function rowsFromMigration(sql: string): CatalogSupplementRow[] {
  const rows: CatalogSupplementRow[] = [];
  const pattern =
    /\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*\$supp\$([\s\S]*?)\$supp\$::jsonb/g;
  for (const match of sql.matchAll(pattern)) {
    const unescape = (value: string) => value.replaceAll("''", "'");
    rows.push({
      kind: unescape(match[1]!),
      key: unescape(match[2]!),
      variant: unescape(match[3]!),
      payload: JSON.parse(match[4]!),
    });
  }
  return rows;
}

function modifierRows(payloads: readonly unknown[]): CatalogSupplementRow[] {
  return payloads.map((payload) => {
    const record = payload as { modifier?: string };
    return {
      kind: "Modifiers",
      key: record.modifier ?? "",
      variant: "",
      payload,
    };
  });
}

describe("CatalogSupplement", () => {
  it("does not keep cargo corrections in committed supplement files", () => {
    for (const file of removedFiles) {
      assert.equal(existsSync(file), false, file);
    }
  });

  it("accepts another kind of payload in the same row shape", () => {
    const payloads = payloadsFromCatalogSupplementRows([
      {
        kind: "Reputation",
        key: "Delta Alliance",
        variant: "",
        payload: { name: "Delta Alliance", environment: null },
      },
    ]);
    assert.deepEqual(payloads, [
      { name: "Delta Alliance", environment: null },
    ]);
  });

  it("rejects a modifier payload whose token does not match the row key", () => {
    assert.throws(
      () =>
        payloadsFromCatalogSupplementRows([
          {
            kind: "Modifiers",
            key: "[HullCap]",
            variant: "",
            payload: { modifier: "[ShCap]", type: "Ship Deflector Dish" },
          },
        ]),
      /does not match payload.modifier/,
    );
  });

  it("changes the import fingerprint when a database row changes", () => {
    const base: CatalogSupplementRow = {
      kind: "Modifiers",
      key: "[HullCap]",
      variant: "",
      payload: {
        modifier: "[HullCap]",
        type: "Ship Deflector Dish",
      },
    };
    const edited: CatalogSupplementRow = {
      ...base,
      payload: {
        modifier: "[HullCap]",
        type: "Ship Deflector Dish,Ship Secondary Deflector",
      },
    };
    const reordered = catalogSupplementFingerprint([edited, base]);
    assert.equal(catalogSupplementFingerprint([base]), catalogSupplementFingerprint([base]));
    assert.notEqual(
      catalogSupplementFingerprint([base]),
      catalogSupplementFingerprint([edited]),
    );
    assert.equal(catalogSupplementFingerprint([base, edited]), reordered);
  });

  it("merges a database row cargo does not contain", async () => {
    const cargo: ModifierCargoRow[] = [
      {
        modifier: "[CtrlX]",
        stats: "+__ Starship Control Expertise",
        type: "Ship Deflector Dish,Ship Secondary Deflector",
        available: null,
        isunique: "0",
        isepic: "0",
        info: null,
      },
    ];
    const reader: CatalogSupplementReader = {
      async findByKind(kind: string) {
        assert.equal(kind, "Modifiers");
        return [
          {
            kind: "Modifiers",
            key: "[HullCap]",
            variant: "",
            payload: {
              modifier: "[HullCap]",
              stats: "+__ Starship Hull Capacity",
              type: "Ship Deflector Dish,Ship Secondary Deflector",
              available: null,
              isunique: "1",
              isepic: "0",
              info: null,
            },
          },
        ];
      },
    };

    const merged = await mergeCatalogSupplement(
      reader,
      "Modifiers",
      cargo,
      (rows, supplement) =>
        mergeModifiers(
          rows,
          supplement as ModifierSupplementRow[],
        ),
    );

    assert.equal(merged.applied, 1);
    assert.equal(merged.rows.length, 2);
    assert.equal(merged.rows[1]?.modifier, "[HullCap]");
    assert.equal(merged.rows[0]?.stats, "+__ Starship Control Expertise");
  });

  it("merges the seeded modifier gaps into Cargo for the picker", async () => {
    const sql = await fs.readFile(migrationPath, "utf8");
    const seeded = modifierRows(payloadsFromMigration(sql));
    const payloads = payloadsFromCatalogSupplementRows(seeded);
    assert.deepEqual(
      seeded.map((row) => row.key).sort(),
      ["[HullCap]", "[HullHeal]", "[Proc]", "[ShCap]", "[ShdHeal]"],
    );

    const cargo = JSON.parse(
      await fs.readFile(cargoPath, "utf8"),
    ) as ModifierCargoRow[];
    const before = new Set(cargo.map((row) => row.modifier));
    assert.equal(before.has("[HullCap]"), false);
    assert.equal(before.has("[ShCap]"), false);
    assert.equal(before.has("[ShdHeal]"), false);
    assert.equal(before.has("[HullHeal]"), true);

    const reader: CatalogSupplementReader = {
      async findByKind() {
        return seeded;
      },
    };
    const merged = await mergeCatalogSupplement(
      reader,
      "Modifiers",
      cargo,
      (rows, supplement) =>
        mergeModifiers(rows, supplement as ModifierSupplementRow[]),
    );

    assert.equal(merged.applied, payloads.length);
    const added = [
      ...new Set(merged.rows.map((row) => row.modifier)),
    ].filter((token) => !before.has(token));
    assert.deepEqual(added.sort(), ["[HullCap]", "[ShCap]", "[ShdHeal]"]);

    const hullCap = merged.rows.find((row) => row.modifier === "[HullCap]");
    const mapped = mapModifier(hullCap!);
    assert.equal(mapped.modifier, "[HullCap]");
    assert.equal(mapped.available, null);
    assert.equal(mapped.isunique, true);
    assert.equal(mapped.isepic, false);
    assert.match(mapped.type, /Ship Deflector Dish/);
    assert.match(mapped.type, /Ship Secondary Deflector/);

    const hullHeal = merged.rows.find((row) => row.modifier === "[HullHeal]");
    assert.equal(hullHeal?.available, null);
    assert.match(hullHeal?.stats ?? "", /Hull Restoration/);

    const shdHeal = merged.rows.find((row) => row.modifier === "[ShdHeal]");
    assert.match(shdHeal?.stats ?? "", /Shield Restoration/);
    assert.match(shdHeal?.type ?? "", /Ship Secondary Deflector/);

    const proc = merged.rows.find((row) => row.modifier === "[Proc]");
    assert.match(proc?.type ?? "", /Ship Fore Weapon/);
    assert.equal(proc?.stats, null);

    const ctrl = cargo.find((row) => row.modifier === "[CtrlX]");
    const ctrlAfter = merged.rows.find(
      (row) => row.modifier === "[CtrlX]" && row.type === ctrl?.type,
    );
    assert.equal(ctrlAfter?.stats, ctrl?.stats);
  });

  it("seeds leftover reputation, set-bonus, and trait rows without rewriting modifiers", async () => {
    const modifierSql = await fs.readFile(migrationPath, "utf8");
    const leftoverSql = await fs.readFile(leftoverMigrationPath, "utf8");
    const modifiers = rowsFromMigration(modifierSql);
    const leftover = rowsFromMigration(leftoverSql);

    assert.deepEqual(
      modifiers.map((row) => row.kind),
      ["Modifiers", "Modifiers", "Modifiers", "Modifiers", "Modifiers"],
    );
    assert.deepEqual(
      [...new Set(leftover.map((row) => row.kind))],
      ["Reputation", "SetBonus", "Traits"],
    );
    assert.equal(leftover.some((row) => row.kind === "Modifiers"), false);
    assert.doesNotMatch(leftoverSql, /\b(DELETE|UPDATE|DROP|TRUNCATE)\b/i);

    const byKind = (kind: string) =>
      leftover.filter((row) => row.kind === kind);
    const reputation = byKind("Reputation");
    const setBonus = byKind("SetBonus");
    const traits = byKind("Traits");
    assert.equal(reputation.length, 10);
    assert.equal(setBonus.length, 5);
    assert.equal(traits.length, 17);
    assert.deepEqual(
      leftover.map((row) => row.variant),
      leftover.map(() => ""),
    );

    assert.equal(payloadsFromCatalogSupplementRows(leftover).length, 32);
    assert.deepEqual(
      reputation.map((row) => row.key),
      [
        "Dyson Joint Command",
        "8472 Counter-Command",
        "Delta Alliance",
        "Iconian Resistance",
        "Terran Task Force",
        "Temporal Defense Initiative",
        "Lukari Restoration Initiative",
        "Competitive Wargames",
        "Gamma Task Force",
        "Discovery Legends",
      ],
    );
    for (const row of reputation) {
      const payload = row.payload as Record<string, unknown>;
      assert.equal(payload.name, row.key);
      assert.equal(payload.environment, null);
      assert.equal(payload.boff, null);
      assert.equal(payload.secondary, null);
      assert.equal(typeof payload.description, "string");
      assert.equal(typeof payload.link, "string");
    }
    const delta = reputation.find((row) => row.key === "Delta Alliance");
    assert.match(
      String((delta?.payload as { description?: string }).description),
      /Project Voyager/,
    );

    const nausicaan = setBonus.find(
      (row) => row.key === "Nausicaan Weaponry Augmentation (2)",
    );
    assert.deepEqual(Object.keys(nausicaan?.payload as object), [
      "Name",
      "SetPage",
      "ReqItems",
      "Passives",
      "TraySkills",
      "Procs",
      "Abilities",
      "Members",
    ]);
    assert.equal(
      (nausicaan?.payload as { Members?: string }).Members,
      "Nausicaan Energy Torpedo Launcher\nNausicaan Disruptor *\nConsole - Science - Nausicaan Siphon Capacitor",
    );
    assert.deepEqual(
      traits.map((row) => row.payload),
      TRAIT_SUPPLEMENTS,
    );
    assert.deepEqual(
      traits.map((row) => row.key),
      TRAIT_SUPPLEMENTS.map((row) => row.name),
    );
  });

  it("merges seeded reputation, set bonus, and trait rows the way the files did", async () => {
    const leftover = rowsFromMigration(
      await fs.readFile(leftoverMigrationPath, "utf8"),
    );
    const reputationRows = leftover.filter((row) => row.kind === "Reputation");
    const setBonusRows = leftover.filter((row) => row.kind === "SetBonus");
    const traitRows = leftover.filter((row) => row.kind === "Traits");

    const reputationCargo = JSON.parse(
      await fs.readFile(reputationCargoPath, "utf8"),
    ) as ReputationCargoRow[];
    const omega = reputationCargo.find((row) => row.name === "Task Force Omega");
    assert.ok(omega);
    assert.equal(
      reputationCargo.some((row) => row.name === "Delta Alliance"),
      false,
    );
    const reputation = await mergeCatalogSupplement(
      {
        async findByKind() {
          return reputationRows;
        },
      },
      "Reputation",
      reputationCargo,
      (rows, supplement) =>
        mergeReputation(rows, supplement as ReputationSupplementRow[]),
    );
    assert.equal(reputation.applied, 10);
    const delta = reputation.rows.find((row) => row.name === "Delta Alliance");
    assert.equal(delta?.environment, null);
    assert.match(delta?.description ?? "", /Project Voyager/);
    assert.equal(
      reputation.rows.find((row) => row.name === "Task Force Omega")?.description,
      omega.description,
    );
    const mappedReputation = mapReputation(delta!);
    assert.equal(mappedReputation.name, "Delta Alliance");
    assert.equal(mappedReputation.environment, null);
    assert.equal(mappedReputation.boff, null);

    const setBonusCargo = JSON.parse(
      await fs.readFile(setBonusCargoPath, "utf8"),
    ) as SetBonusCargoRow[];
    assert.equal(
      setBonusCargo.some((row) => row.Name === "Bio-Molecular Instability"),
      false,
    );
    const setBonus = await mergeCatalogSupplement(
      {
        async findByKind() {
          return setBonusRows;
        },
      },
      "SetBonus",
      setBonusCargo,
      (rows, supplement) =>
        mergeSetBonus(rows, supplement as SetBonusSupplementRow[]),
    );
    assert.equal(setBonus.applied, 5);
    assert.equal(setBonus.rows.length, setBonusCargo.length + 5);
    const instability = setBonus.rows.find(
      (row) => row.Name === "Bio-Molecular Instability",
    );
    assert.equal(instability?.SetPage, "Counter-Command Ordnance");
    assert.equal(instability?.ReqItems, "2");
    assert.match(instability?.Members ?? "", /Heavy Bio-Molecular \* Turret/);
    assert.match(instability?.Passives ?? "", /Bonus Phaser/);
    const untouched = setBonusCargo[0];
    const untouchedAfter = setBonus.rows.find((row) => row.Name === untouched?.Name);
    assert.equal(untouchedAfter?.Passives, untouched?.Passives);

    const traitCargo = JSON.parse(
      await fs.readFile(traitsCargoPath, "utf8"),
    ) as TraitCargoRow[];
    const trait = await mergeCatalogSupplement(
      {
        async findByKind() {
          return traitRows;
        },
      },
      "Traits",
      traitCargo,
      (rows, supplement) => mergeTraits(rows, supplement as TraitSupplementRow[]),
    );
    assert.equal(trait.applied, 17);
    assert.equal(trait.rows.length, traitCargo.length);
    for (const expected of TRAIT_SUPPLEMENTS) {
      const before = traitCargo.find(
        (row) =>
          row.name === expected.name &&
          row.type === expected.type &&
          row.environment === expected.environment,
      );
      const after = trait.rows.find(
        (row) =>
          row.name === expected.name &&
          row.type === expected.type &&
          row.environment === expected.environment,
      );
      assert.equal(before?.career, null, expected.name);
      assert.equal(after?.career, expected.career, expected.name);
      assert.equal(after?.description, before?.description, expected.name);
    }
    const goodDay = trait.rows.find(
      (row) => row.name === "A Good Day to Die" && row.environment === "space",
    );
    assert.equal(mapTrait(goodDay!).career, "tac");
    assert.match(goodDay?.description ?? "", /Go Down Fighting/);
    const crippling = traitCargo.find((row) => row.name === "Crippling Fire");
    assert.equal(
      trait.rows.find(
        (row) =>
          row.name === "Crippling Fire" &&
          row.type === crippling?.type &&
          row.environment === crippling?.environment,
      )?.career,
      crippling?.career,
    );
  });

  it("picks up a database edit to a leftover supplement on the next merge", async () => {
    const leftover = rowsFromMigration(
      await fs.readFile(leftoverMigrationPath, "utf8"),
    );
    const traits = leftover.filter((row) => row.kind === "Traits");
    const edited = traits.map((row) =>
      row.key === "Tricorder Analysis"
        ? {
            ...row,
            payload: {
              ...(row.payload as Record<string, unknown>),
              career: "eng",
            },
          }
        : row,
    );
    assert.notEqual(
      catalogSupplementFingerprint(traits),
      catalogSupplementFingerprint(edited),
    );

    const cargo = JSON.parse(
      await fs.readFile(traitsCargoPath, "utf8"),
    ) as TraitCargoRow[];
    const merged = await mergeCatalogSupplement(
      {
        async findByKind(kind: string) {
          assert.equal(kind, "Traits");
          return edited;
        },
      },
      "Traits",
      cargo,
      (rows, supplement) => mergeTraits(rows, supplement as TraitSupplementRow[]),
    );
    assert.equal(
      merged.rows.find(
        (row) =>
          row.name === "Tricorder Analysis" && row.environment === "ground",
      )?.career,
      "eng",
    );
    assert.equal(
      merged.rows.find(
        (row) => row.name === "A Good Day to Die" && row.environment === "space",
      )?.career,
      "tac",
    );
  });

  it("reads the leftover kinds from CatalogSupplement, not supplement files", () => {
    assert.equal(importMappings.Reputation.supplementKind, "Reputation");
    assert.equal(importMappings.SetBonus.supplementKind, "SetBonus");
    assert.equal(importMappings.Traits.supplementKind, "Traits");
    assert.equal(importMappings.Modifiers.supplementKind, "Modifiers");
    assert.equal("supplementFile" in importMappings.Reputation, false);
    assert.equal("supplementFile" in importMappings.SetBonus, false);
    assert.equal("supplementFile" in importMappings.Traits, false);
    assert.equal("supplementFile" in importMappings.Modifiers, false);
  });

  it("rejects a leftover payload whose identity does not match the row key", () => {
    assert.throws(
      () =>
        payloadsFromCatalogSupplementRows([
          {
            kind: "SetBonus",
            key: "Bio-Molecular Instability",
            variant: "",
            payload: { Name: "Degenerative Wave Signature" },
          },
        ]),
      /does not match payload\.Name/,
    );
    assert.throws(
      () =>
        payloadsFromCatalogSupplementRows([
          {
            kind: "Traits",
            key: "A Good Day to Die",
            variant: "",
            payload: { name: "A Good Day to Die" },
          },
        ]),
      /payload\.type is required/,
    );
  });
});
