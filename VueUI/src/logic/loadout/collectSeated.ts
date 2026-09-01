import type { BindScope, CatalogKind } from "@/logic/collection/types";
import { isUniqueLimited } from "./setBonus";
import type { LoadoutCatalogKind, LoadoutItem } from "./types";

export type SeatedCollectFill = {
  itemId: number;
  catalogKind?: LoadoutCatalogKind;
};

export type CollectSeatedRequest = {
  kind: CatalogKind;
  catalogId: number;
  bind?: BindScope;
  allowDuplicate?: boolean;
};

function fillKind(fill: SeatedCollectFill): CatalogKind | "traySkill" {
  return fill.catalogKind ?? "item";
}

function isUniqueCollectible(
  kind: CatalogKind,
  item: Pick<LoadoutItem, "equiplimit"> | undefined,
): boolean {
  if (kind !== "item") return true;
  if (!item) return true;
  return isUniqueLimited(item);
}

function ownershipKey(kind: CatalogKind, catalogId: number): string {
  return `${kind}:${catalogId}`;
}

/**
 * One collect request per missing seated copy.
 * Unique gear stays a single copy; stackable items can add more copies.
 */
export function collectRequestsForSeated(input: {
  fills: ReadonlyArray<SeatedCollectFill>;
  items: ReadonlyArray<Pick<LoadoutItem, "id" | "catalogKind" | "equiplimit">>;
  ownedCount: (kind: CatalogKind, catalogId: number) => number;
  bindFor?: (kind: CatalogKind, catalogId: number) => BindScope | undefined;
}): CollectSeatedRequest[] {
  const catalog = new Map(
    input.items.map((item) => [
      ownershipKey(item.catalogKind ?? "item", item.id),
      item,
    ]),
  );
  const needed = new Map<string, { kind: CatalogKind; catalogId: number }>();
  const seatedCounts = new Map<string, number>();

  for (const fill of input.fills) {
    const kind = fillKind(fill);
    if (kind === "traySkill") continue;
    const key = ownershipKey(kind, fill.itemId);
    seatedCounts.set(key, (seatedCounts.get(key) ?? 0) + 1);
    needed.set(key, { kind, catalogId: fill.itemId });
  }

  const requests: CollectSeatedRequest[] = [];
  for (const [key, identity] of needed) {
    const item = catalog.get(key);
    const unique = isUniqueCollectible(identity.kind, item);
    const want = unique ? 1 : (seatedCounts.get(key) ?? 0);
    const have = input.ownedCount(identity.kind, identity.catalogId);
    const missing = Math.max(0, want - have);
    if (missing === 0) continue;

    const bind = input.bindFor?.(identity.kind, identity.catalogId);
    for (let i = 0; i < missing; i += 1) {
      requests.push({
        kind: identity.kind,
        catalogId: identity.catalogId,
        ...(bind ? { bind } : {}),
        allowDuplicate: true,
      });
    }
  }
  return requests;
}
