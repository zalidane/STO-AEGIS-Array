import {
  allowsAccountUnlockFromCost,
  allowsAccountUnlockFromGrantingShips,
  bindScopeForKind,
} from "./bind";
import {
  bindChoiceFromHull,
  bindChoiceFromGrantingShips,
} from "./bindChoice";
import type { BindScope, CatalogKind } from "./types";

export type CatalogBindShip = {
  id: number;
  cost?: string | null;
  name?: string | null;
  displayPrefix?: string | null;
  uniconsoleId?: number | null;
  experimentalWeaponId?: number | null;
};

export type CatalogBindStarshipTrait = {
  id: number;
  ships?: Array<{
    cost?: string | null;
    name?: string | null;
    displayPrefix?: string | null;
  }>;
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

function grantingShipHulls(
  sources: CatalogBindSources,
  kind: CatalogKind,
  catalogId: number,
) {
  if (kind === "ship") {
    const ship = sources.ships.find((row) => row.id === catalogId);
    return ship ? [ship] : [];
  }
  if (kind === "starshipTrait") {
    const trait = sources.starshipTraits.find((row) => row.id === catalogId);
    return trait?.ships ?? [];
  }
  if (kind === "item") {
    return sources.ships.filter(
      (ship) =>
        ship.uniconsoleId === catalogId ||
        ship.experimentalWeaponId === catalogId,
    );
  }
  return [];
}

function grantingShipCosts(
  sources: CatalogBindSources,
  kind: CatalogKind,
  catalogId: number,
): Array<string | null | undefined> {
  return grantingShipHulls(sources, kind, catalogId).map((ship) => ship.cost);
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
    return allowsAccountUnlockFromCost(ship?.cost, ship);
  }
  return allowsAccountUnlockFromGrantingShips(
    grantingShipHulls(sources, kind, catalogId),
  );
}

export function bindChoicePromptFromCatalog(
  sources: CatalogBindSources,
  kind: CatalogKind,
  catalogId: number,
): string {
  if (kind === "trait") return "";
  if (kind === "ship") {
    const ship = sources.ships.find((row) => row.id === catalogId);
    return bindChoiceFromHull(ship ?? {}).prompt;
  }
  return bindChoiceFromGrantingShips(
    grantingShipHulls(sources, kind, catalogId),
  ).prompt;
}
