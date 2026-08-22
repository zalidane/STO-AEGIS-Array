import {
  allowsAccountUnlockFromCost,
  allowsAccountUnlockFromGrantingShips,
  bindScopeForKind,
} from "./bind";
import type { BindScope, CatalogKind } from "./types";

export type CatalogBindShip = {
  id: number;
  cost?: string | null;
  uniconsoleId?: number | null;
};

export type CatalogBindStarshipTrait = {
  id: number;
  ships?: Array<{ cost?: string | null }>;
};

export type CatalogBindItem = {
  id: number;
  boundto?: string | null;
};

export type CatalogBindSources = {
  ships: CatalogBindShip[];
  starshipTraits: CatalogBindStarshipTrait[];
  items: CatalogBindItem[];
};

function grantingShipCosts(
  sources: CatalogBindSources,
  kind: CatalogKind,
  catalogId: number,
): Array<string | null | undefined> {
  if (kind === "ship") {
    const ship = sources.ships.find((row) => row.id === catalogId);
    return ship ? [ship.cost] : [];
  }
  if (kind === "starshipTrait") {
    const trait = sources.starshipTraits.find((row) => row.id === catalogId);
    return trait?.ships?.map((ship) => ship.cost) ?? [];
  }
  if (kind === "item") {
    return sources.ships
      .filter((ship) => ship.uniconsoleId === catalogId)
      .map((ship) => ship.cost);
  }
  return [];
}

export function bindScopeFromCatalog(
  sources: CatalogBindSources,
  kind: CatalogKind,
  catalogId: number,
): BindScope {
  if (kind === "trait") return "character";

  if (kind === "ship") {
    const ship = sources.ships.find((row) => row.id === catalogId);
    return bindScopeForKind({ kind: "ship", shipCost: ship?.cost });
  }

  if (kind === "starshipTrait") {
    return bindScopeForKind({
      kind: "starshipTrait",
      grantingShipCosts: grantingShipCosts(sources, kind, catalogId),
    });
  }

  const item = sources.items.find((row) => row.id === catalogId);
  return bindScopeForKind({
    kind: "item",
    grantingShipCosts: grantingShipCosts(sources, kind, catalogId),
    boundto: item?.boundto,
  });
}

export function allowsAccountUnlockFromCatalog(
  sources: CatalogBindSources,
  kind: CatalogKind,
  catalogId: number,
): boolean {
  if (kind === "trait") return false;
  if (kind === "ship") {
    const ship = sources.ships.find((row) => row.id === catalogId);
    return allowsAccountUnlockFromCost(ship?.cost);
  }
  return allowsAccountUnlockFromGrantingShips(
    grantingShipCosts(sources, kind, catalogId),
  );
}
