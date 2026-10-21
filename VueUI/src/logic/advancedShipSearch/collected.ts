import {
  charactersOnAccount,
  getActiveAccount,
} from "@/logic/collection/accounts";
import { bindScopeFromShipCost } from "@/logic/collection/bind";
import { resolvedBindForEntry } from "@/logic/collection/state";
import type { BindScope, CollectionState } from "@/logic/collection/types";

export type CollectedHullShip = {
  id: number;
  cost?: string | null;
};

/**
 * Collected cell for one hull on the active STO account.
 * Account-bound wins over captain names. Empty when this account has no copy.
 */
export function formatCollectedHullCell(
  state: CollectionState,
  ship: CollectedHullShip,
): string {
  const account = getActiveAccount(state);
  if (!account) return "";

  const captains = charactersOnAccount(state, account.id);
  const captainIds = new Set(captains.map((captain) => captain.id));
  const catalogBind = bindScopeFromShipCost(ship.cost);
  const bindByCaptain = new Map<string, BindScope>();

  for (const entry of state.entries) {
    if (entry.kind !== "ship" || entry.catalogId !== ship.id) continue;
    if (!captainIds.has(entry.characterId)) continue;
    const bind = resolvedBindForEntry(entry, catalogBind);
    const previous = bindByCaptain.get(entry.characterId);
    if (previous === "account") continue;
    if (bind === "account" || previous == null) {
      bindByCaptain.set(entry.characterId, bind);
    }
  }

  if (bindByCaptain.size === 0) return "";
  if ([...bindByCaptain.values()].some((bind) => bind === "account")) {
    return "Collected: Account";
  }

  const names = captains
    .filter((captain) => bindByCaptain.has(captain.id))
    .map((captain) => captain.name);
  if (names.length === 0) return "";
  return `Collected: ${names.join(", ")}`;
}
