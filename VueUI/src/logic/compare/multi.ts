import {
  buildCompareSections,
  type CompareHull,
  type CompareSection,
  type CompareTone,
} from "./rows";

export type CompareCell = {
  text: string;
  tone: CompareTone;
};

export type MultiCompareRow = {
  key: string;
  label: string;
  cells: CompareCell[];
};

export type MultiCompareSection = {
  id: string;
  title: string;
  rows: MultiCompareRow[];
};

function mergeSection(
  pairSections: CompareSection[],
): MultiCompareSection {
  const titled = pairSections[0];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const section of pairSections) {
    for (const row of section.rows) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      keys.push(row.key);
    }
  }

  const rows: MultiCompareRow[] = keys.map((key) => {
    const samples = pairSections.map((section) =>
      section.rows.find((row) => row.key === key),
    );
    const labeled = samples.find((row) => row != null);
    const cells: CompareCell[] = [
      { text: labeled?.left ?? "—", tone: null },
    ];
    for (const sample of samples) {
      cells.push({
        text: sample?.right ?? "—",
        tone: sample?.rightTone ?? null,
      });
    }
    return {
      key,
      label: labeled?.label ?? key,
      cells,
    };
  });

  return {
    id: titled?.id ?? "section",
    title: titled?.title ?? "",
    rows,
  };
}

/**
 * Columns follow hull order. The first hull is the baseline; every later
 * column is the right-hand side of `buildCompareSections` against that hull,
 * so tones match the two-hull compare page.
 */
export function buildMultiCompareSections(
  hulls: readonly CompareHull[],
): MultiCompareSection[] {
  if (hulls.length === 0) return [];
  const baseline = hulls[0];
  if (!baseline) return [];
  if (hulls.length === 1) {
    return buildCompareSections(baseline, baseline).map((section) => ({
      id: section.id,
      title: section.title,
      rows: section.rows.map((row) => ({
        key: row.key,
        label: row.label,
        cells: [{ text: row.left, tone: null }],
      })),
    }));
  }

  const pairs = hulls
    .slice(1)
    .map((hull) => buildCompareSections(baseline, hull));
  const sectionCount = pairs[0]?.length ?? 0;
  const sections: MultiCompareSection[] = [];
  for (let index = 0; index < sectionCount; index += 1) {
    const column = pairs
      .map((pair) => pair[index])
      .filter((section): section is CompareSection => section != null);
    if (column.length === 0) continue;
    sections.push(mergeSection(column));
  }
  return sections;
}
