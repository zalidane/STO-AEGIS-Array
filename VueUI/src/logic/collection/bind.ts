import {
  shipCostCurrencyCodes,
} from "@/utils/parsers/shipCost";
import type { BindScope, CatalogKind } from "./types";

/** Infobox.boundto values observed in wiki cargo: account, character, yes, null. */
export function bindScopeFromBoundTo(
  boundto: string | null | undefined,
): BindScope {
  const value = boundto?.trim().toLowerCase();
  if (!value) return "unknown";
  if (value === "account") return "account";
  if (value === "character") return "character";
  return "unknown";
}

/**
 * Account-wide acquisition: Zen Store and other in-game store unlocks
 * (dilithium, fleet, requisition, veteran). Phoenix / Anniversary packs are
 * not listed here — those default to character-bound with an account-unlock choice.
 */
const ACCOUNT_CURRENCIES = new Set([
  "zen",
  "veteran",
  "dil",
  "fc",
  "fsm",
  "r&d",
]);

/**
 * Former event / promo hulls. Wiki cost is the later character-bound claim
 * (Phoenix token or Anniversary Prize Pack), but every one of these was once
 * obtainable account-wide (event reclaim).
 */
const ACCOUNT_UNLOCK_CURRENCIES = new Set(["app", "ppp5", "ppps"]);

/** Character-bound acquisition: lock box, lobi, mission reward. */
const CHARACTER_CURRENCIES = new Set(["lb", "lc", "mr"]);

export { shipCostCurrencyCodes };

function isAccountCurrency(code: string): boolean {
  if (ACCOUNT_CURRENCIES.has(code)) return true;
  return code.startsWith("sr");
}

function isAccountUnlockCurrency(code: string): boolean {
  return ACCOUNT_UNLOCK_CURRENCIES.has(code);
}

export function allowsAccountUnlockFromCost(
  cost: string | null | undefined,
): boolean {
  return shipCostCurrencyCodes(cost).some((code) =>
    isAccountUnlockCurrency(code.toLowerCase()),
  );
}

export function allowsAccountUnlockFromGrantingShips(
  costs: Array<string | null | undefined>,
): boolean {
  return costs.some((cost) => allowsAccountUnlockFromCost(cost));
}

/**
 * Hull bind from wiki `cost`.
 * Phoenix / Anniversary pack costs default to character-bound; the player can
 * mark a copy as account-unlocked when collecting.
 */
export function bindScopeFromShipCost(
  cost: string | null | undefined,
): BindScope {
  const codes = shipCostCurrencyCodes(cost).map((code) => code.toLowerCase());
  if (codes.length === 0) return "unknown";
  if (codes.some(isAccountCurrency)) return "account";
  if (
    codes.some(
      (code) =>
        CHARACTER_CURRENCIES.has(code) || isAccountUnlockCurrency(code),
    )
  ) {
    return "character";
  }
  return "unknown";
}

/**
 * Catalog default for granted traits / unique consoles follows granting hulls.
 * Dual-path Phoenix/APP copies may still be marked account-unlocked per captain.
 */
export function inheritBindFromGrantingShips(
  costs: Array<string | null | undefined>,
): BindScope {
  const scopes = costs.map(bindScopeFromShipCost);
  if (scopes.includes("account")) return "account";
  if (scopes.includes("character")) return "character";
  return "unknown";
}

/**
 * Fallback when acquisition data is missing.
 * Personal traits are per captain; ships and grants must be resolved from cost.
 */
export function defaultBindForKind(kind: CatalogKind): BindScope {
  if (kind === "trait") return "character";
  return "unknown";
}

export function bindScopeForKind(options: {
  kind: CatalogKind;
  boundto?: string | null;
  shipCost?: string | null;
  grantingShipCosts?: Array<string | null | undefined>;
}): BindScope {
  if (options.kind === "trait") return "character";
  if (options.kind === "ship") {
    return bindScopeFromShipCost(options.shipCost);
  }
  if (options.kind === "starshipTrait") {
    return inheritBindFromGrantingShips(options.grantingShipCosts ?? []);
  }
  const fromShips = inheritBindFromGrantingShips(
    options.grantingShipCosts ?? [],
  );
  if (fromShips !== "unknown") return fromShips;
  return bindScopeFromBoundTo(options.boundto);
}

export function resolveBindScope(options: {
  kind: CatalogKind;
  boundto?: string | null;
  shipCost?: string | null;
  grantingShipCosts?: Array<string | null | undefined>;
}): BindScope {
  return bindScopeForKind(options);
}

export function bindScopeLabel(scope: BindScope): string {
  if (scope === "account") return "BtA";
  if (scope === "character") return "BtC";
  return "Bind unknown";
}
