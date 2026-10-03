import { normalizeCatalogSearchText } from "@/utils/normalizeCatalogSearch";
import { copiesAllowed, loadoutOwnershipKey } from "@/logic/loadout/setBonus";
import type { LoadoutCatalogKind, LoadoutItem, LoadoutSlotFill } from "@/logic/loadout/types";

function fillCatalogKind(
  fill: Pick<LoadoutSlotFill, "catalogKind">,
): LoadoutCatalogKind {
  return fill.catalogKind ?? "item";
}

function plainIdentity(value: string | null | undefined): string {
  return normalizeCatalogSearchText(value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Stat text with numbers and punctuation removed, so duplicate cargo rows
 * of one item match while a different effect stays distinct.
 */
export function pickerEffectSignature(
  value: string | null | undefined,
): string {
  return normalizeCatalogSearchText(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function itemIdentityKey(item: LoadoutItem): string | null {
  if ((item.catalogKind ?? "item") !== "item") return null;
  return [
    plainIdentity(item.name),
    plainIdentity(item.type),
    plainIdentity(item.rarity),
  ].join("|");
}

function clusterByEffect(group: readonly LoadoutItem[]): LoadoutItem[][] {
  const byEffect = new Map<string, LoadoutItem[]>();
  for (const item of group) {
    const effect = pickerEffectSignature(item.searchText);
    const list = byEffect.get(effect) ?? [];
    list.push(item);
    byEffect.set(effect, list);
  }
  const empty = byEffect.get("") ?? [];
  byEffect.delete("");
  const nonempty = [...byEffect.values()];
  // An incomplete cargo row has no body copy. Fold it into the one real effect.
  if (empty.length > 0 && nonempty.length === 1) {
    nonempty[0]?.push(...empty);
    return nonempty;
  }
  if (empty.length > 0) nonempty.push(empty);
  return nonempty;
}

function earliestIndex(
  members: readonly LoadoutItem[],
  indexOf: ReadonlyMap<LoadoutItem, number>,
): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const item of members) {
    const index = indexOf.get(item);
    if (index != null && index < earliest) earliest = index;
  }
  return earliest;
}

function strictestEquipLimit(
  members: readonly LoadoutItem[],
): number | null | undefined {
  let strictest: number | undefined;
  for (const item of members) {
    const limit = item.equiplimit;
    if (limit == null || limit <= 0) continue;
    if (strictest == null || limit < strictest) strictest = limit;
  }
  return strictest;
}

function longestSearchText(members: readonly LoadoutItem[]): string | null {
  let best = "";
  for (const item of members) {
    const text = item.searchText ?? "";
    if (text.length > best.length) best = text;
  }
  return best || null;
}

export function pickerCandidateIds(item: Pick<LoadoutItem, "id" | "mergedIds">): number[] {
  return item.mergedIds?.length ? item.mergedIds : [item.id];
}

export function pickerCandidateOwned(
  item: Pick<LoadoutItem, "id" | "catalogKind" | "mergedIds">,
  ownedKeys: ReadonlySet<string>,
): boolean {
  return pickerCandidateIds(item).some((id) =>
    ownedKeys.has(loadoutOwnershipKey(item.catalogKind, id)),
  );
}

function toRepresentative(
  members: readonly LoadoutItem[],
  ownedKeys: ReadonlySet<string>,
): LoadoutItem {
  const owned = members.filter((item) => pickerCandidateOwned(item, ownedKeys));
  const pool = owned.length > 0 ? owned : members;
  const chosen = [...pool].sort((left, right) => left.id - right.id)[0];
  if (!chosen) {
    throw new Error("expected a picker representative");
  }
  const equiplimit = strictestEquipLimit(members);
  return {
    ...chosen,
    equiplimit: equiplimit ?? chosen.equiplimit,
    searchText: longestSearchText(members) ?? chosen.searchText,
    mergedIds: members.map((item) => item.id).sort((left, right) => left - right),
  };
}

/**
 * One pick-list row per logical gear item.
 * Same name, type, rarity, and effect collapse (faction or ship catalog copies).
 * A different rarity or a different effect stays its own row.
 * Traits and bridge-officer powers are left untouched.
 */
export function mergeLogicalPickerItems(
  items: readonly LoadoutItem[],
  ownedKeys: ReadonlySet<string> = new Set(),
): LoadoutItem[] {
  const indexOf = new Map<LoadoutItem, number>();
  items.forEach((item, index) => indexOf.set(item, index));

  const clusters: LoadoutItem[][] = [];
  const byIdentity = new Map<string, LoadoutItem[]>();
  for (const item of items) {
    const identity = itemIdentityKey(item);
    if (!identity) {
      clusters.push([item]);
      continue;
    }
    const group = byIdentity.get(identity) ?? [];
    group.push(item);
    byIdentity.set(identity, group);
  }
  for (const group of byIdentity.values()) {
    clusters.push(...clusterByEffect(group));
  }

  clusters.sort(
    (left, right) => earliestIndex(left, indexOf) - earliestIndex(right, indexOf),
  );

  return clusters.map((members) =>
    members.length === 1 ? members[0]! : toRepresentative(members, ownedKeys),
  );
}

export function logicalGroupHasOpenCopy(
  item: Pick<LoadoutItem, "id" | "equiplimit" | "type" | "catalogKind" | "mergedIds">,
  fills: ReadonlyArray<Pick<LoadoutSlotFill, "slotId" | "itemId" | "catalogKind">>,
  exceptSlotId?: string,
): boolean {
  const allowed = copiesAllowed(item);
  if (!Number.isFinite(allowed)) return true;
  const ids = new Set(pickerCandidateIds(item));
  const kind = item.catalogKind ?? "item";
  const seated = fills.filter(
    (fill) =>
      ids.has(fill.itemId) &&
      fillCatalogKind(fill) === kind &&
      fill.slotId !== exceptSlotId,
  ).length;
  return seated < allowed;
}
