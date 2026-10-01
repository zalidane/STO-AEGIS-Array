/**
 * Merge Cargo Traits rows with a committed supplement (#69).
 *
 * Rules:
 * - Match on name + type + environment (same identity as the Prisma unique key).
 * - Fill empty `career` (and other empty scalar fields) from the supplement.
 * - Non-empty wiki fields are not clobbered.
 * - Unknown identities are inserted as full Cargo-shaped rows.
 */

export type TraitCargoRow = {
  name: string;
  type: string;
  environment: string | null;
  description: string | null;
  "short description": string | null;
  required: string | null;
  possible: string | null;
  career: string | null;
  source: string | null;
  "char variant": string | null;
  "boff variant": string | null;
  "doff variant": string | null;
  "icon name": string | null;
  master: string;
};

export type TraitSupplementRow = Partial<TraitCargoRow> & {
  name: string;
  type: string;
  environment?: string | null;
};

function nonempty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function identityKey(
  name: string,
  type: string,
  environment: string | null | undefined,
): string {
  return [
    name.trim().toLowerCase(),
    type.trim().toLowerCase(),
    (environment ?? "").trim().toLowerCase(),
  ].join("\0");
}

function fillEmpty(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  return nonempty(current) ?? nonempty(incoming);
}

function toCargoRow(row: TraitSupplementRow): TraitCargoRow {
  if (!nonempty(row.name) || !nonempty(row.type)) {
    throw new Error("Trait supplement insert requires name and type");
  }
  return {
    name: row.name.trim(),
    type: row.type.trim(),
    environment: nonempty(row.environment) ?? "",
    description: nonempty(row.description),
    "short description": nonempty(row["short description"]),
    required: nonempty(row.required),
    possible: nonempty(row.possible),
    career: nonempty(row.career),
    source: nonempty(row.source),
    "char variant": nonempty(row["char variant"]),
    "boff variant": nonempty(row["boff variant"]),
    "doff variant": nonempty(row["doff variant"]),
    "icon name": nonempty(row["icon name"]),
    master: nonempty(row.master) ?? "1",
  };
}

export function mergeTraits(
  cargo: readonly TraitCargoRow[],
  supplement: readonly TraitSupplementRow[],
): TraitCargoRow[] {
  const rows = cargo.map((row) => ({ ...row }));
  const indexByKey = new Map(
    rows.map((row, index) => [
      identityKey(row.name, row.type, row.environment),
      index,
    ]),
  );

  for (const extra of supplement) {
    if (!nonempty(extra.name) || !nonempty(extra.type)) {
      throw new Error("Trait supplement rows require non-empty name and type");
    }
    const key = identityKey(extra.name, extra.type, extra.environment);
    const existingAt = indexByKey.get(key);
    if (existingAt == null) {
      indexByKey.set(key, rows.length);
      rows.push(toCargoRow(extra));
      continue;
    }
    const current = rows[existingAt]!;
    rows[existingAt] = {
      ...current,
      description: fillEmpty(current.description, extra.description),
      "short description": fillEmpty(
        current["short description"],
        extra["short description"],
      ),
      required: fillEmpty(current.required, extra.required),
      possible: fillEmpty(current.possible, extra.possible),
      career: fillEmpty(current.career, extra.career),
      source: fillEmpty(current.source, extra.source),
      "char variant": fillEmpty(current["char variant"], extra["char variant"]),
      "boff variant": fillEmpty(current["boff variant"], extra["boff variant"]),
      "doff variant": fillEmpty(current["doff variant"], extra["doff variant"]),
      "icon name": fillEmpty(current["icon name"], extra["icon name"]),
      master: fillEmpty(current.master, extra.master) ?? current.master,
    };
  }
  return rows;
}
