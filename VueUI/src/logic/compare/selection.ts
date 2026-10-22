export const COMPARE_HULL_LIMIT = 4;

function isShipId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Query keys `a` … follow COMPARE_HULL_LIMIT so the route grows with the cap. */
export function compareQueryKey(index: number): string {
  return String.fromCharCode("a".charCodeAt(0) + index);
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

/** Add, remove, or replace the last hull once the cap is full. */
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
  return [...current.slice(0, COMPARE_HULL_LIMIT - 1), shipId];
}

export function isCompareSelected(
  ids: readonly number[],
  shipId: number,
): boolean {
  return normalizeCompareIds(ids).includes(shipId);
}

/** Two or more selected hulls can open the compare page. */
export function canOpenCompare(ids: readonly number[]): boolean {
  return normalizeCompareIds(ids).length >= 2;
}

export function comparePath(ids: readonly number[]): string {
  const normalized = normalizeCompareIds(ids);
  if (normalized.length === 0) return "/ships/compare";
  const params = new URLSearchParams();
  normalized.forEach((id, index) => {
    params.set(compareQueryKey(index), String(id));
  });
  return `/ships/compare?${params.toString()}`;
}

export function parseCompareQuery(
  query: Partial<Record<string, unknown>>,
): number[] {
  const ids: number[] = [];
  for (let index = 0; index < COMPARE_HULL_LIMIT; index += 1) {
    const value = query[compareQueryKey(index)];
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

/**
 * Hull on the ship page first, then every other selected hull in selection
 * order. The page hull is not repeated when it is already selected.
 */
export function quickCompareHullIds(
  currentId: number,
  selectedIds: readonly number[],
): number[] {
  const others = normalizeCompareIds(selectedIds).filter(
    (id) => id !== currentId,
  );
  if (!isShipId(currentId)) return others;
  return [currentId, ...others];
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
