export const COMPARE_HULL_LIMIT = 2;

function isShipId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function normalizeCompareIds(ids: readonly number[]): number[] {
  const seen = new Set<number>();
  const next: number[] = [];
  for (const id of ids) {
    if (!isShipId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= COMPARE_HULL_LIMIT) break;
  }
  return next;
}

/** Add, remove, or replace the second hull. Never more than two. */
export function toggleCompareId(
  ids: readonly number[],
  shipId: number,
): number[] {
  if (!isShipId(shipId)) return normalizeCompareIds(ids);
  const current = normalizeCompareIds(ids);
  if (current.includes(shipId)) {
    return current.filter((id) => id !== shipId);
  }
  if (current.length < COMPARE_HULL_LIMIT) {
    return [...current, shipId];
  }
  const first = current[0];
  return first == null ? [shipId] : [first, shipId];
}

export function isCompareSelected(
  ids: readonly number[],
  shipId: number,
): boolean {
  return normalizeCompareIds(ids).includes(shipId);
}

export function canOpenCompare(ids: readonly number[]): boolean {
  return normalizeCompareIds(ids).length === COMPARE_HULL_LIMIT;
}

export function comparePath(ids: readonly number[]): string {
  const [left, right] = normalizeCompareIds(ids);
  if (left != null && right != null) {
    return `/ships/compare?a=${left}&b=${right}`;
  }
  if (left != null) return `/ships/compare?a=${left}`;
  return "/ships/compare";
}

export function parseCompareQuery(query: {
  a?: unknown;
  b?: unknown;
}): number[] {
  const raw = [query.a, query.b];
  const ids: number[] = [];
  for (const value of raw) {
    const n =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;
    if (isShipId(n)) ids.push(n);
  }
  return normalizeCompareIds(ids);
}

export function compareToggleLabel(
  ids: readonly number[],
  shipId: number,
): string {
  if (isCompareSelected(ids, shipId)) return "Remove from compare";
  if (normalizeCompareIds(ids).length >= COMPARE_HULL_LIMIT) {
    return "Replace compared hull";
  }
  return "Select for compare";
}
