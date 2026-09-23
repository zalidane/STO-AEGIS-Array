import { normalizeCatalogSearchText } from "@/utils/normalizeCatalogSearch";
import { TIER_BY_ID, shipRewards, type PackReward } from "./data";

/** Filter pack ship rewards for the Configuration target picker. */
export function filterPackTargetShips(
  query: unknown,
  ships: readonly PackReward[] = shipRewards(),
): PackReward[] {
  const q = normalizeCatalogSearchText(query);
  if (!q) return [...ships];

  return ships.filter((ship) => {
    const name = normalizeCatalogSearchText(ship.name);
    const tier = normalizeCatalogSearchText(
      TIER_BY_ID.get(ship.tierId)?.label ?? "",
    );
    return name.includes(q) || tier.includes(q);
  });
}
