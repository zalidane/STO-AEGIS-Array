export function preferredItemIdsForNextSlot(
  slots: ReadonlyArray<{ id: string; kind: string; index: number }>,
  fills: ReadonlyArray<{ slotId: string; itemId: number }>,
  current: { kind: string; index: number },
): number[] {
  const fillBySlot = new Map(fills.map((fill) => [fill.slotId, fill.itemId]));
  const earlier = slots
    .filter((slot) => slot.kind === current.kind && slot.index < current.index)
    .sort((left, right) => right.index - left.index);

  const preferred: number[] = [];
  const seen = new Set<number>();
  for (const slot of earlier) {
    const itemId = fillBySlot.get(slot.id);
    if (itemId == null || seen.has(itemId)) continue;
    seen.add(itemId);
    preferred.push(itemId);
  }
  return preferred;
}

export function rankPickerCandidates<T extends { id: number }>(
  candidates: ReadonlyArray<T>,
  preferredIds: ReadonlyArray<number>,
): T[] {
  if (preferredIds.length === 0) return [...candidates];
  const rank = new Map(preferredIds.map((id, index) => [id, index]));
  return [...candidates].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank == null && rightRank == null) return 0;
    if (leftRank == null) return 1;
    if (rightRank == null) return -1;
    return leftRank - rightRank;
  });
}
