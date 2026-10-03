/**
 * Database corrections merged with Cargo on import (#11).
 *
 * CatalogSupplement is one table for every missing-data kind. `kind` selects
 * the Cargo table; `payload` is the Cargo-shaped record that table's merger
 * already understands. Import reads the rows. It does not replace them, so a
 * correction survives the next Cargo import without a repository change.
 */

import { createHash } from "node:crypto";

import type { PrismaClient } from "@sto-aegis/database";

export type CatalogSupplementRow = {
  kind: string;
  key: string;
  variant: string;
  payload: unknown;
};

export type CatalogSupplementReader = {
  findByKind(kind: string): Promise<CatalogSupplementRow[]>;
};

export function prismaCatalogSupplementReader(
  prisma: PrismaClient,
): CatalogSupplementReader {
  return {
    async findByKind(kind: string) {
      const rows = await prisma.catalogSupplement.findMany({
        where: { kind },
        orderBy: [{ key: "asc" }, { variant: "asc" }, { id: "asc" }],
        select: { kind: true, key: true, variant: true, payload: true },
      });
      return rows;
    },
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

/** Stable hash of supplement rows so a database edit re-imports without a Cargo change. */
export function catalogSupplementFingerprint(
  rows: readonly Pick<
    CatalogSupplementRow,
    "kind" | "key" | "variant" | "payload"
  >[],
): string {
  const canonical = [...rows]
    .map((row) => ({
      kind: row.kind,
      key: row.key,
      variant: row.variant,
      payload: row.payload,
    }))
    .sort((left, right) => {
      const leftKey = `${left.kind}\0${left.key}\0${left.variant}\0${canonicalJson(left.payload)}`;
      const rightKey = `${right.kind}\0${right.key}\0${right.variant}\0${canonicalJson(right.payload)}`;
      return leftKey.localeCompare(rightKey);
    });
  return createHash("sha256").update(canonicalJson(canonical)).digest("hex");
}

function assertObjectPayload(
  row: CatalogSupplementRow,
): Record<string, unknown> {
  if (
    row.payload == null ||
    typeof row.payload !== "object" ||
    Array.isArray(row.payload)
  ) {
    throw new Error(
      `CatalogSupplement ${row.kind}/${row.key} payload must be an object`,
    );
  }
  return row.payload as Record<string, unknown>;
}

function assertModifierPayload(
  row: CatalogSupplementRow,
  payload: Record<string, unknown>,
): void {
  const modifier = payload.modifier;
  const type = payload.type;
  if (typeof modifier !== "string" || !modifier.trim()) {
    throw new Error(
      `CatalogSupplement Modifiers/${row.key} payload.modifier is required`,
    );
  }
  if (modifier !== row.key) {
    throw new Error(
      `CatalogSupplement Modifiers key ${row.key} does not match payload.modifier ${modifier}`,
    );
  }
  if (typeof type !== "string" || !type.trim()) {
    throw new Error(
      `CatalogSupplement Modifiers/${row.key} payload.type is required`,
    );
  }
  const merge = payload._merge;
  if (merge != null && (typeof merge !== "object" || Array.isArray(merge))) {
    throw new Error(
      `CatalogSupplement Modifiers/${row.key} _merge must be an object`,
    );
  }
}

/**
 * Validate stored rows and return the payloads a kind's merger consumes.
 * Modifiers check token identity. Any other kind accepts a Cargo-shaped object
 * so a later table can reuse this store without a new schema.
 */
export function payloadsFromCatalogSupplementRows(
  rows: readonly CatalogSupplementRow[],
): unknown[] {
  return rows.map((row) => {
    if (!row.kind.trim() || !row.key.trim()) {
      throw new Error("CatalogSupplement rows require kind and key");
    }
    const payload = assertObjectPayload(row);
    if (row.kind === "Modifiers") {
      assertModifierPayload(row, payload);
    }
    return payload;
  });
}

export async function mergeCatalogSupplement<T>(
  reader: CatalogSupplementReader,
  kind: string,
  rows: T[],
  merge: (cargo: T[], supplement: unknown) => T[],
): Promise<{ rows: T[]; applied: number }> {
  const stored = await reader.findByKind(kind);
  const supplement = payloadsFromCatalogSupplementRows(stored);
  if (supplement.length === 0) return { rows, applied: 0 };
  return { rows: merge(rows, supplement), applied: supplement.length };
}
