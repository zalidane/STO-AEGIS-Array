import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import { storeToRefs } from "pinia";
import { useCollectionStore } from "@/stores/collection";
import { raceLabel } from "@/logic/captain/identity";
import {
  asBoffPower,
  asCaptainTrait,
  lookupLoadoutItem,
} from "@/logic/loadout/catalogMap";
import { pickerCandidatesFor } from "@/logic/loadout/pickerCandidates";
import { equipMessage } from "@/logic/loadout/equipMessages";
import {
  BOFF_CATALOG_KIND,
  boffRankAbbrev,
  stationForSlot,
  type BoffPlayableCareer,
  type BoffStation,
  type BoffStationSlot,
} from "@/logic/loadout/boffPowers";
import {
  type CaptainTraitSlot,
} from "@/logic/loadout/captainTraits";
import { fillForSlot } from "@/logic/loadout/state";
import { loadoutOwnershipKey } from "@/logic/loadout/setBonus";
import type { HullSlot } from "@/logic/loadout/hullSlots";
import { hangarShipFromCatalog } from "@/logic/loadout/hangarWho";
import type { CollectionLoadout, LoadoutItem } from "@/logic/loadout/types";
import type { LoadoutModifier } from "@/logic/loadout/slotModifiers";
import { abbreviateBoffPart } from "@/utils/formatters";

export function useLoadoutPicker(input: {
  catalogItems: MaybeRefOrGetter<ReadonlyArray<LoadoutItem>>;
  itemByKey: MaybeRefOrGetter<ReadonlyMap<string, LoadoutItem>>;
  ownedKeys: MaybeRefOrGetter<ReadonlySet<string>>;
  modifierCatalog: MaybeRefOrGetter<ReadonlyArray<LoadoutModifier>>;
  hullSlots: MaybeRefOrGetter<ReadonlyArray<HullSlot>>;
  captainSlots: MaybeRefOrGetter<ReadonlyArray<CaptainTraitSlot>>;
  boffStations: MaybeRefOrGetter<ReadonlyArray<BoffStation>>;
  activeLoadout: MaybeRefOrGetter<CollectionLoadout | null>;
  onlyCollected: MaybeRefOrGetter<boolean>;
  ship?: MaybeRefOrGetter<{
    name: string;
    wikiName?: string | null;
    type?: string | null;
    displayType?: string | null;
    displayClass?: string | null;
    shipType?: { name?: string | null } | null;
    tier?: number | null;
  } | null>;
}) {
  const store = useCollectionStore();
  const { activeCharacter } = storeToRefs(store);

  const pickerOpen = ref(false);
  const pickerHullSlot = ref<HullSlot | null>(null);
  const pickerCaptainSlot = ref<CaptainTraitSlot | null>(null);
  const pickerBoffSlot = ref<BoffStationSlot | null>(null);
  const pickerSearch = ref("");
  const pickerError = ref("");

  function catalogItems() {
    return toValue(input.catalogItems);
  }

  function seatedFills() {
    return [...(toValue(input.activeLoadout)?.slots ?? [])];
  }

  function captainIdentity() {
    return {
      career: activeCharacter.value?.career,
      raceLabel: raceLabel(
        activeCharacter.value?.faction,
        activeCharacter.value?.race,
      ),
    };
  }

  function currentShip() {
    return hangarShipFromCatalog(toValue(input.ship));
  }

  function equipContext() {
    return {
      hullSlots: toValue(input.hullSlots),
      items: catalogItems(),
      ownedKeys: toValue(input.ownedKeys),
      modifiers: toValue(input.modifierCatalog),
      requireOwned: toValue(input.onlyCollected),
      ship: currentShip(),
    };
  }

  function boffPowerContext() {
    return {
      stations: toValue(input.boffStations),
      powers: catalogItems()
        .filter((item) => item.catalogKind === BOFF_CATALOG_KIND)
        .map(asBoffPower),
    };
  }

  function itemInCaptainSlot(slot: CaptainTraitSlot): LoadoutItem | null {
    const fill = fillForSlot(toValue(input.activeLoadout), slot.id);
    if (!fill) return null;
    return lookupLoadoutItem(
      toValue(input.itemByKey),
      fill.catalogKind === "trait" || fill.catalogKind === "starshipTrait"
        ? fill.catalogKind
        : slot.catalogKind,
      fill.itemId,
    );
  }

  function itemIsOwned(item: LoadoutItem): boolean {
    return toValue(input.ownedKeys).has(
      loadoutOwnershipKey(item.catalogKind, item.id),
    );
  }

  const pickerLabel = computed(() => {
    if (pickerBoffSlot.value) {
      const located = stationForSlot(
        toValue(input.boffStations),
        pickerBoffSlot.value.id,
      );
      const seat = located
        ? `${boffRankAbbrev(located.station.seat.rank)} ${abbreviateBoffPart(located.station.seat.career)}`
        : "BOff";
      return `${seat} · ${pickerBoffSlot.value.rankLabel}`;
    }
    return pickerCaptainSlot.value?.label ?? pickerHullSlot.value?.label ?? "";
  });

  const pickerHasFill = computed(() => {
    if (pickerCaptainSlot.value) {
      return Boolean(itemInCaptainSlot(pickerCaptainSlot.value));
    }
    const slotId =
      pickerBoffSlot.value?.id ?? pickerHullSlot.value?.id ?? null;
    if (!slotId) return false;
    return Boolean(fillForSlot(toValue(input.activeLoadout), slotId));
  });

  const pickerCandidates = computed(() =>
    pickerCandidatesFor({
      query: pickerSearch.value,
      hullSlot: pickerHullSlot.value,
      captainSlot: pickerCaptainSlot.value,
      boffSlot: pickerBoffSlot.value,
      catalog: catalogItems(),
      stations: toValue(input.boffStations),
      hullSlots: toValue(input.hullSlots),
      hullFills: toValue(input.activeLoadout)?.slots ?? [],
      seated: seatedFills(),
      collectedOnly: toValue(input.onlyCollected),
      ownedKeys: toValue(input.ownedKeys),
      identity: captainIdentity(),
      ship: currentShip(),
    }),
  );

  function resetPicker() {
    pickerSearch.value = "";
    pickerError.value = "";
    pickerOpen.value = true;
  }

  function openPicker(slot: HullSlot) {
    pickerHullSlot.value = slot;
    pickerCaptainSlot.value = null;
    pickerBoffSlot.value = null;
    resetPicker();
  }

  function openCaptainPicker(slot: CaptainTraitSlot) {
    if (slot.locked) return;
    pickerCaptainSlot.value = slot;
    pickerHullSlot.value = null;
    pickerBoffSlot.value = null;
    resetPicker();
  }

  function openBoffPicker(slot: BoffStationSlot) {
    pickerBoffSlot.value = slot;
    pickerCaptainSlot.value = null;
    pickerHullSlot.value = null;
    resetPicker();
  }

  function pickerCandidateKey(item: LoadoutItem): string {
    return `${loadoutOwnershipKey(item.catalogKind, item.id)}:${item.abilityRank ?? ""}`;
  }

  function chooseItem(item: LoadoutItem) {
    const boffSlot = pickerBoffSlot.value;
    if (boffSlot) {
      const loadout = toValue(input.activeLoadout);
      if (!loadout) return;
      const result = store.equipBoffPower(
        {
          loadoutId: loadout.id,
          slotId: boffSlot.id,
          itemId: item.id,
          abilityRank: item.abilityRank,
        },
        boffPowerContext(),
      );
      if (!result.ok) {
        pickerError.value = equipMessage(result.reason);
        return;
      }
      pickerOpen.value = false;
      return;
    }

    const captainSlot = pickerCaptainSlot.value;
    if (captainSlot) {
      const loadout = toValue(input.activeLoadout);
      if (!loadout) return;
      const result = store.equipCaptainTrait(
        {
          loadoutId: loadout.id,
          slotId: captainSlot.id,
          itemId: item.id,
          catalogKind:
            item.catalogKind === "starshipTrait" ? "starshipTrait" : "trait",
        },
        {
          slots: [...toValue(input.captainSlots)],
          traits: catalogItems().map(asCaptainTrait),
          ownedKeys: toValue(input.ownedKeys),
          requireOwned: toValue(input.onlyCollected),
          career: activeCharacter.value?.career,
          raceLabel: raceLabel(
            activeCharacter.value?.faction,
            activeCharacter.value?.race,
          ),
        },
      );
      if (!result.ok) {
        pickerError.value = equipMessage(result.reason);
        return;
      }
      pickerOpen.value = false;
      return;
    }

    const loadout = toValue(input.activeLoadout);
    const slot = pickerHullSlot.value;
    if (!loadout || !slot) return;
    const result = store.equipSlot(
      {
        loadoutId: loadout.id,
        slotId: slot.id,
        itemId: item.id,
        catalogKind:
          item.catalogKind === "starshipTrait" ? "starshipTrait" : "item",
      },
      equipContext(),
    );
    if (!result.ok) {
      pickerError.value = equipMessage(result.reason);
      return;
    }
    pickerOpen.value = false;
  }

  function clearSlot(slotId: string) {
    const loadout = toValue(input.activeLoadout);
    if (!loadout) return;
    store.unequipSlot(loadout.id, slotId);
  }

  function clearPickerSlot() {
    if (pickerCaptainSlot.value) {
      const loadout = toValue(input.activeLoadout);
      if (loadout) {
        store.unequipCaptainTrait(loadout.id, pickerCaptainSlot.value.id);
      }
      pickerOpen.value = false;
      return;
    }
    if (pickerBoffSlot.value) {
      clearSlot(pickerBoffSlot.value.id);
      pickerOpen.value = false;
      return;
    }
    if (!pickerHullSlot.value) return;
    clearSlot(pickerHullSlot.value.id);
    pickerOpen.value = false;
  }

  function onBoffCareer(stationIndex: number, career: BoffPlayableCareer) {
    const loadout = toValue(input.activeLoadout);
    if (!loadout) return;
    store.setBoffSeatCareer(
      { loadoutId: loadout.id, stationIndex, career },
      boffPowerContext(),
    );
  }

  return {
    pickerOpen,
    pickerHullSlot,
    pickerCaptainSlot,
    pickerBoffSlot,
    pickerSearch,
    pickerError,
    pickerLabel,
    pickerHasFill,
    pickerCandidates,
    itemInCaptainSlot,
    itemIsOwned,
    pickerCandidateKey,
    openPicker,
    openCaptainPicker,
    openBoffPicker,
    chooseItem,
    clearPickerSlot,
    clearSlot,
    equipContext,
    boffPowerContext,
    onBoffCareer,
    seatedFills,
  };
}
