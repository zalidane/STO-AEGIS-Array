/**
 * Merge Cargo Modifiers rows with a committed supplement.
 *
 * Rules:
 * - Missing (modifier) tokens are inserted as full Cargo-shaped rows.
 * - Existing tokens widen `type` / `available` (comma-list union).
 * - Wiki `stats` / flags are not clobbered when already set.
 * - `_merge.clearAvailable` drops a Cargo allowlist so Type drives eligibility.
 */

export type ModifierCargoRow = {
  modifier: string;
  stats: string | null;
  type: string;
  available: string | null;
  isunique: string;
  isepic: string;
  info: string | null;
};

export type ModifierSupplementRow = Partial<ModifierCargoRow> & {
  modifier: string;
  type: string;
  _merge?: {
    /** Drop Cargo `available` so eligibility follows Type only. */
    clearAvailable?: boolean;
    /** When several Cargo rows share this modifier, match this exact type. */
    matchType?: string;
  };
};

export function splitCommaList(value: string | null | undefined): string[] {
  if (value == null || !String(value).trim()) return [];
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function unionCommaList(
  base: string | null | undefined,
  extra: string | null | undefined,
): string | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of [...splitCommaList(base), ...splitCommaList(extra)]) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.length > 0 ? out.join(",") : null;
}

function stripMergeMeta(
  row: ModifierSupplementRow,
): Omit<ModifierSupplementRow, "_merge"> {
  const { _merge: _ignored, ...rest } = row;
  return rest;
}

function toCargoRow(row: ModifierSupplementRow): ModifierCargoRow {
  const clean = stripMergeMeta(row);
  if (clean.type == null || clean.type === "") {
    throw new Error(
      `Modifier supplement insert for ${clean.modifier} requires type`,
    );
  }
  return {
    modifier: clean.modifier,
    stats: clean.stats ?? null,
    type: clean.type,
    available: clean.available ?? null,
    isunique: clean.isunique ?? "0",
    isepic: clean.isepic ?? "0",
    info: clean.info ?? null,
  };
}

function findTargetIndex(
  cargo: ModifierCargoRow[],
  supplement: ModifierSupplementRow,
): number {
  const sameName = cargo
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.modifier === supplement.modifier);

  if (sameName.length === 0) return -1;

  const matchType = supplement._merge?.matchType ?? null;
  if (matchType != null) {
    const exact = sameName.find(({ row }) => row.type === matchType);
    return exact?.index ?? -1;
  }

  const exactType = sameName.find(({ row }) => row.type === supplement.type);
  if (exactType) return exactType.index;

  if (sameName.length === 1) return sameName[0]!.index;

  // Ambiguous multi-row modifier with no exact/matchType — treat as insert.
  return -1;
}

function mergeIntoExisting(
  existing: ModifierCargoRow,
  supplement: ModifierSupplementRow,
): ModifierCargoRow {
  const clearAvailable = supplement._merge?.clearAvailable === true;
  const widenedType =
    unionCommaList(existing.type, supplement.type) ?? existing.type;

  let available = existing.available;
  if (clearAvailable) {
    available = null;
  } else if (supplement.available != null && supplement.available !== "") {
    available = unionCommaList(existing.available, supplement.available);
  }

  // Existing Cargo rows: widen type/available only. Never replace wiki stats,
  // uniqueness/epic flags, or info (null stats stay null).
  return {
    modifier: existing.modifier,
    stats: existing.stats,
    type: widenedType,
    available,
    isunique: existing.isunique,
    isepic: existing.isepic,
    info: existing.info,
  };
}

/**
 * Returns Cargo rows with supplement applied. Does not mutate inputs.
 * Supplement `_merge` metadata is stripped from output rows.
 */
export function mergeModifiers(
  cargo: readonly ModifierCargoRow[],
  supplement: readonly ModifierSupplementRow[],
): ModifierCargoRow[] {
  const next = cargo.map((row) => ({ ...row }));

  for (const entry of supplement) {
    if (!entry?.modifier || entry.type == null || entry.type === "") {
      throw new Error(
        "Modifier supplement rows require non-empty modifier and type",
      );
    }

    const index = findTargetIndex(next, entry);
    if (index < 0) {
      next.push(toCargoRow(entry));
      continue;
    }

    next[index] = mergeIntoExisting(next[index]!, entry);
  }

  return next;
}
