import type { CatalogKind, CollectionState } from "./types";
import type { CollectionLoadout } from "@/logic/loadout/types";

export type DenseSerialRange = {
  min: number;
  count: number;
};

/** True when ids are a contiguous autoincrement block with no gaps. */
export function denseSerialRange(
  ids: readonly number[],
): DenseSerialRange | null {
  if (ids.length === 0) return null;
  const unique = [...new Set(ids)].sort((a, b) => a - b);
  const min = unique[0]!;
  const max = unique[unique.length - 1]!;
  if (max - min + 1 !== unique.length) return null;
  return { min, count: unique.length };
}

/**
 * Map a stale autoincrement id from an earlier wipe-and-reinsert onto the
 * current dense serial block. Returns null when the id is not a prior generation.
 */
export function remapSerialCatalogId(
  oldId: number,
  range: DenseSerialRange,
): number | null {
  const max = range.min + range.count - 1;
  if (oldId >= range.min && oldId <= max) return oldId;
  if (oldId >= range.min) return null;
  const generations = Math.ceil((range.min - oldId) / range.count);
  if (generations < 1) return null;
  const next = oldId + generations * range.count;
  if (next < range.min || next > max) return null;
  return next;
}

/**
 * Re-point collected items and seated loadout fills after Infobox replace-imports
 * allocated a new SERIAL range for the same row order.
 */
export function alignCollectionToCatalog(
  state: CollectionState,
  kind: CatalogKind,
  catalogIds: readonly number[],
): CollectionState {
  const range = denseSerialRange(catalogIds);
  if (!range) return state;
  const live = new Set(catalogIds);

  let changed = false;

  const entries = state.entries.map((entry) => {
    if (entry.kind !== kind || live.has(entry.catalogId)) return entry;
    const next = remapSerialCatalogId(entry.catalogId, range);
    if (next == null || !live.has(next)) return entry;
    changed = true;
    return { ...entry, catalogId: next };
  });

  const loadouts =
    kind === "item"
      ? state.loadouts.map((loadout) =>
          alignLoadoutItemIds(loadout, range, live, () => {
            changed = true;
          }),
        )
      : state.loadouts;

  if (!changed) return state;
  return { ...state, entries, loadouts };
}

function alignLoadoutItemIds(
  loadout: CollectionLoadout,
  range: DenseSerialRange,
  live: ReadonlySet<number>,
  onChange: () => void,
): CollectionLoadout {
  let slotChanged = false;
  const slots = loadout.slots.map((slot) => {
    const slotKind = slot.catalogKind ?? "item";
    if (slotKind !== "item" || live.has(slot.itemId)) return slot;
    const next = remapSerialCatalogId(slot.itemId, range);
    if (next == null || !live.has(next)) return slot;
    slotChanged = true;
    onChange();
    return { ...slot, itemId: next };
  });
  return slotChanged ? { ...loadout, slots } : loadout;
}
