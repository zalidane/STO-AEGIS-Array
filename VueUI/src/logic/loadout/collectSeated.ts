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

function collectibleKind(
  kind: LoadoutCatalogKind | undefined,
): CatalogKind | null {
  const resolved = kind ?? "item";
  if (resolved === "traySkill") return null;
  return resolved;
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
 * When `shipId` is set and the hull is not owned, include a ship collect
 * request first (same bind rules as the catalog via `bindFor`).
 */
export function collectRequestsForSeated(input: {
  fills: ReadonlyArray<SeatedCollectFill>;
  items: ReadonlyArray<Pick<LoadoutItem, "id" | "catalogKind" | "equiplimit">>;
  ownedCount: (kind: CatalogKind, catalogId: number) => number;
  bindFor?: (kind: CatalogKind, catalogId: number) => BindScope | undefined;
  /** Seated hull on the builder; collected when missing from this captain. */
  shipId?: number | null;
}): CollectSeatedRequest[] {
  const requests: CollectSeatedRequest[] = [];

  if (input.shipId != null && Number.isFinite(input.shipId) && input.shipId > 0) {
    const shipId = input.shipId;
    if (input.ownedCount("ship", shipId) === 0) {
      const bind = input.bindFor?.("ship", shipId);
      requests.push({
        kind: "ship",
        catalogId: shipId,
        ...(bind ? { bind } : {}),
        allowDuplicate: true,
      });
    }
  }

  const catalog = new Map(
    input.items.flatMap((item) => {
      const kind = collectibleKind(item.catalogKind);
      if (!kind) return [];
      return [[ownershipKey(kind, item.id), item] as const];
    }),
  );
  const needed = new Map<string, { kind: CatalogKind; catalogId: number }>();
  const seatedCounts = new Map<string, number>();

  for (const fill of input.fills) {
    const kind = collectibleKind(fill.catalogKind);
    if (!kind) continue;
    const key = ownershipKey(kind, fill.itemId);
    seatedCounts.set(key, (seatedCounts.get(key) ?? 0) + 1);
    needed.set(key, { kind, catalogId: fill.itemId });
  }

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
