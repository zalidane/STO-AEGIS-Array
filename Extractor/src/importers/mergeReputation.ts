/**
 * Merge Cargo Reputation rows with CatalogSupplement payloads (#80).
 *
 * The wiki Reputation Cargo table currently only stores a few true reputations
 * (empty `environment`) plus specialization tracks. Trait sources and the
 * in-game reputation system list ~13 reputation factions; missing ones are
 * filled from CatalogSupplement until Cargo catches up.
 *
 * Rules:
 * - Missing names are inserted as full Cargo-shaped rows.
 * - Existing names fill empty description / released / icon / colors / link /
 *   environment / boff / secondary.
 * - Non-empty wiki fields are not clobbered.
 */

export type ReputationCargoRow = {
  color1: string | null;
  color2: string | null;
  icon: string | null;
  link: string | null;
  name: string;
  description: string | null;
  released: string | null;
  environment: string | null;
  boff: string | null;
  secondary: string | null;
};

export type ReputationSupplementRow = Partial<ReputationCargoRow> & {
  name: string;
};

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? value!.trim() : null;
}

function toCargoRow(row: ReputationSupplementRow): ReputationCargoRow {
  return {
    name: row.name.trim(),
    color1: nonempty(row.color1),
    color2: nonempty(row.color2),
    icon: nonempty(row.icon),
    link: nonempty(row.link),
    description: nonempty(row.description),
    released: nonempty(row.released),
    environment: nonempty(row.environment),
    boff: nonempty(row.boff),
    secondary: nonempty(row.secondary),
  };
}

function fillEmpty(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  return nonempty(current) ?? nonempty(incoming);
}

export function mergeReputation(
  cargo: readonly ReputationCargoRow[],
  supplement: readonly ReputationSupplementRow[],
): ReputationCargoRow[] {
  const rows = cargo.map((row) => ({ ...row }));
  const indexByName = new Map(
    rows.map((row, index) => [row.name.trim().toLowerCase(), index]),
  );

  for (const extra of supplement) {
    const key = extra.name.trim().toLowerCase();
    const existingAt = indexByName.get(key);
    if (existingAt == null) {
      const inserted = toCargoRow(extra);
      indexByName.set(key, rows.length);
      rows.push(inserted);
      continue;
    }
    const current = rows[existingAt]!;
    rows[existingAt] = {
      ...current,
      color1: fillEmpty(current.color1, extra.color1),
      color2: fillEmpty(current.color2, extra.color2),
      icon: fillEmpty(current.icon, extra.icon),
      link: fillEmpty(current.link, extra.link),
      description: fillEmpty(current.description, extra.description),
      released: fillEmpty(current.released, extra.released),
      environment: fillEmpty(current.environment, extra.environment),
      boff: fillEmpty(current.boff, extra.boff),
      secondary: fillEmpty(current.secondary, extra.secondary),
    };
  }
  return rows;
}
