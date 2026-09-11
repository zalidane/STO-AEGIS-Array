/**
 * Merge Cargo SetBonus rows with a committed supplement (#13).
 *
 * Rules:
 * - Missing bonus Names are inserted as full Cargo-shaped rows.
 * - Existing Names fill empty SetPage / ReqItems / Passives / Procs / Members.
 * - Non-empty wiki Passives / Procs are not clobbered.
 * - Members lists are unioned (newline-separated glob patterns).
 */

export type SetBonusCargoRow = {
  Name: string;
  SetPage: string | null;
  ReqItems: string | null;
  Passives: string | null;
  TraySkills: string | null;
  Procs: string | null;
  Abilities: string | null;
  Members?: string | null;
};

export type SetBonusSupplementRow = Partial<SetBonusCargoRow> & {
  Name: string;
};

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  return trimmed ? value!.trim() : null;
}

export function splitMemberList(value: string | null | undefined): string[] {
  if (value == null || !String(value).trim()) return [];
  return String(value)
    .split(/\r?\n|;/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function unionMemberList(
  base: string | null | undefined,
  extra: string | null | undefined,
): string | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of [...splitMemberList(base), ...splitMemberList(extra)]) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out.length > 0 ? out.join("\n") : null;
}

function toCargoRow(row: SetBonusSupplementRow): SetBonusCargoRow {
  return {
    Name: row.Name,
    SetPage: nonempty(row.SetPage) ?? null,
    ReqItems: nonempty(row.ReqItems) ?? null,
    Passives: nonempty(row.Passives) ?? null,
    TraySkills: nonempty(row.TraySkills) ?? null,
    Procs: nonempty(row.Procs) ?? null,
    Abilities: nonempty(row.Abilities) ?? null,
    Members: unionMemberList(null, row.Members),
  };
}

function fillEmpty(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  return nonempty(current) ?? nonempty(incoming);
}

export function mergeSetBonus(
  cargo: readonly SetBonusCargoRow[],
  supplement: readonly SetBonusSupplementRow[],
): SetBonusCargoRow[] {
  const rows = cargo.map((row) => ({ ...row }));
  const indexByName = new Map(
    rows.map((row, index) => [row.Name.trim().toLowerCase(), index]),
  );

  for (const extra of supplement) {
    const key = extra.Name.trim().toLowerCase();
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
      SetPage: fillEmpty(current.SetPage, extra.SetPage),
      ReqItems: fillEmpty(current.ReqItems, extra.ReqItems),
      Passives: fillEmpty(current.Passives, extra.Passives),
      TraySkills: fillEmpty(current.TraySkills, extra.TraySkills),
      Procs: fillEmpty(current.Procs, extra.Procs),
      Abilities: fillEmpty(current.Abilities, extra.Abilities),
      Members: unionMemberList(current.Members, extra.Members),
    };
  }
  return rows;
}
