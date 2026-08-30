type ContainsFilter = {
  contains: string;
  mode: "insensitive";
};

export function textContains(text: string): ContainsFilter {
  return { contains: text, mode: "insensitive" };
}

/** Prisma `OR` of case-insensitive `contains` filters for string fields. */
export function orTextFields(text: string, fields: readonly string[]) {
  return {
    OR: fields.map((field) => ({ [field]: textContains(text) })),
  };
}

export function mergeUniqueById<T extends { id: number }>(
  primary: readonly T[],
  secondary: readonly T[],
): T[] {
  const seen = new Set<number>();
  const merged: T[] = [];
  for (const row of [...primary, ...secondary]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged;
}
