import {
  BOFF_CATALOG_KIND,
  boffPowerDisplayName,
  powerRankIndexesForSlot,
  stationForSlot,
  type BoffStation,
  type BoffStationSlot,
} from "@/logic/loadout/boffPowers";
import {
  asBoffPower,
  asCaptainTrait,
} from "@/logic/loadout/catalogMap";
import {
  captainTraitOwnershipKey,
  traitFitsCaptainSlot,
  type CaptainTraitSlot,
} from "@/logic/loadout/captainTraits";
import type { CaptainCareer } from "@/logic/captain/identity";
import {
  preferredItemIdsForNextSlot,
  rankPickerCandidates,
} from "@/logic/loadout/pickerRank";
import { matchesPickerQuery } from "@/logic/loadout/pickerSearch";
import {
  hangarPetFitsShip,
  type HangarShip,
} from "@/logic/loadout/hangarWho";
import {
  itemFitsHullSlot,
  itemHasOpenCopy,
  loadoutOwnershipKey,
} from "@/logic/loadout/setBonus";
import type { HullSlot } from "@/logic/loadout/hullSlots";
import type { LoadoutItem, LoadoutSlotFill } from "@/logic/loadout/types";

export type PickerSeatedFill = Pick<
  LoadoutSlotFill,
  "slotId" | "itemId" | "catalogKind"
>;

export type PickerCaptainIdentity = {
  career?: CaptainCareer | null;
  raceLabel?: string | null;
};

export function fittingItems(input: {
  kind: HullSlot["kind"];
  catalog: ReadonlyArray<LoadoutItem>;
  seated: ReadonlyArray<PickerSeatedFill>;
  collectedOnly: boolean;
  ownedKeys: ReadonlySet<string>;
  exceptSlotId?: string;
  ship?: HangarShip | null;
}): LoadoutItem[] {
  return input.catalog.filter((item) => {
    if (!itemFitsHullSlot(item, input.kind)) return false;
    if (input.kind === "hangar" && !hangarPetFitsShip(item, input.ship)) {
      return false;
    }
    if (!itemHasOpenCopy(item, input.seated, input.exceptSlotId)) return false;
    if (!input.collectedOnly) return true;
    return input.ownedKeys.has(
      loadoutOwnershipKey(item.catalogKind, item.id),
    );
  });
}

export function fittingCaptainTraits(input: {
  slot: CaptainTraitSlot;
  catalog: ReadonlyArray<LoadoutItem>;
  seated: ReadonlyArray<PickerSeatedFill>;
  collectedOnly: boolean;
  ownedKeys: ReadonlySet<string>;
  identity: PickerCaptainIdentity;
  exceptSlotId?: string;
}): LoadoutItem[] {
  return input.catalog.filter((item) => {
    if (!traitFitsCaptainSlot(asCaptainTrait(item), input.slot, input.identity)) {
      return false;
    }
    if (!itemHasOpenCopy(item, input.seated, input.exceptSlotId)) return false;
    if (!input.collectedOnly) return true;
    return input.ownedKeys.has(
      captainTraitOwnershipKey(
        item.catalogKind === "starshipTrait" ? "starshipTrait" : "trait",
        item.id,
      ),
    );
  });
}

export function fittingBoffPowers(input: {
  slot: BoffStationSlot;
  stations: ReadonlyArray<BoffStation>;
  catalog: ReadonlyArray<LoadoutItem>;
}): LoadoutItem[] {
  const located = stationForSlot(input.stations, input.slot.id);
  if (!located) return [];
  const rows: LoadoutItem[] = [];
  for (const item of input.catalog) {
    if (item.catalogKind !== BOFF_CATALOG_KIND) continue;
    const power = asBoffPower(item);
    for (const abilityRank of powerRankIndexesForSlot(
      power,
      input.slot,
      located.station,
    )) {
      rows.push({ ...item, abilityRank });
    }
  }
  return rows;
}

export function pickerCandidatesFor(input: {
  query: string;
  hullSlot?: HullSlot | null;
  captainSlot?: CaptainTraitSlot | null;
  boffSlot?: BoffStationSlot | null;
  catalog: ReadonlyArray<LoadoutItem>;
  stations: ReadonlyArray<BoffStation>;
  hullSlots: ReadonlyArray<HullSlot>;
  hullFills: ReadonlyArray<PickerSeatedFill>;
  seated: ReadonlyArray<PickerSeatedFill>;
  collectedOnly: boolean;
  ownedKeys: ReadonlySet<string>;
  identity: PickerCaptainIdentity;
  ship?: HangarShip | null;
}): LoadoutItem[] {
  const query = input.query.trim();
  const captainSlot = input.captainSlot ?? null;
  const hullSlot = input.hullSlot ?? null;
  const boffSlot = input.boffSlot ?? null;

  const pool = captainSlot
    ? fittingCaptainTraits({
        slot: captainSlot,
        catalog: input.catalog,
        seated: input.seated,
        collectedOnly: input.collectedOnly,
        ownedKeys: input.ownedKeys,
        identity: input.identity,
        exceptSlotId: captainSlot.id,
      })
    : boffSlot
      ? fittingBoffPowers({
          slot: boffSlot,
          stations: input.stations,
          catalog: input.catalog,
        })
      : hullSlot
        ? fittingItems({
            kind: hullSlot.kind,
            catalog: input.catalog,
            seated: input.seated,
            collectedOnly: input.collectedOnly,
            ownedKeys: input.ownedKeys,
            exceptSlotId: hullSlot.id,
            ship: input.ship,
          })
        : [];

  if (boffSlot) {
    const named = pool.map((item) => ({
      ...item,
      name: boffPowerDisplayName(
        asBoffPower(item),
        boffSlot.rank,
        item.abilityRank,
      ),
    }));
    return named.filter((item) => matchesPickerQuery(item, query));
  }

  const matched = pool.filter((item) => matchesPickerQuery(item, query));
  if (!hullSlot || captainSlot) return matched;
  return rankPickerCandidates(
    matched,
    preferredItemIdsForNextSlot(input.hullSlots, input.hullFills, hullSlot),
  );
}
