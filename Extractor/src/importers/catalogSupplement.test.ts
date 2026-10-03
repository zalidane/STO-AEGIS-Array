import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { mapModifier } from "../mappers/cargoMappers.js";
import {
  catalogSupplementFingerprint,
  mergeCatalogSupplement,
  payloadsFromCatalogSupplementRows,
  type CatalogSupplementReader,
  type CatalogSupplementRow,
} from "./catalogSupplement.js";
import {
  mergeModifiers,
  type ModifierCargoRow,
  type ModifierSupplementRow,
} from "./mergeModifiers.js";

const here = __dirname;
const cargoPath = resolve(here, "../../output/Modifiers.json");
const removedFile = resolve(here, "../../output/supplements/Modifiers.json");
const migrationPath = resolve(
  here,
  "../../../packages/database/prisma/migrations/20261003153000_add_catalog_supplement/migration.sql",
);

function payloadsFromMigration(sql: string): unknown[] {
  const payloads: unknown[] = [];
  const pattern = /\$supp\$([\s\S]*?)\$supp\$::jsonb/g;
  for (const match of sql.matchAll(pattern)) {
    payloads.push(JSON.parse(match[1]!));
  }
  return payloads;
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
  it("does not keep modifier corrections in a committed file", () => {
    assert.equal(existsSync(removedFile), false);
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
});
