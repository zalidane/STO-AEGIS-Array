import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  ModifiersDocument,
  SetBonusesDocument,
  ShipDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  TraitsDocument,
  TraySkillsDocument,
} from "@/graphql/generated/graphql";
import { useAlignItemCatalog } from "@/composables/useAlignItemCatalog";
import { useCollectionStore } from "@/stores/collection";
import {
  resolvedBindForEntry,
  visibleCatalogIds,
} from "@/logic/collection/state";
import { bindScopeFromCatalog } from "@/logic/collection/catalogBind";
import type { CollectionEntry } from "@/logic/collection/types";
import {
  buildLoadoutCatalog,
  indexLoadoutItemsByKey,
} from "@/logic/loadout/catalogMap";
import { captainTraitOwnershipKey } from "@/logic/loadout/captainTraits";
import { ownedKeysIncludingHullGrants } from "@/logic/loadout/hullGrants";
import type { LoadoutModifier } from "@/logic/loadout/slotModifiers";

export function useLoadoutCatalog(shipId: MaybeRefOrGetter<number>) {
  const store = useCollectionStore();
  const { state } = storeToRefs(store);

  const { result: shipResult, loading: shipLoading, error: shipError } =
    useQuery(ShipDocument, () => ({ id: toValue(shipId) }));
  const { result: shipsResult } = useQuery(ShipsDocument);
  const { result: itemsResult, loading: itemsLoading } =
    useQuery(InfoboxesDocument);
  useAlignItemCatalog(() => itemsResult.value?.infoboxes);
  const { result: traitsResult, loading: traitsLoading } = useQuery(
    StarshipTraitsDocument,
  );
  const { result: personalTraitsResult, loading: personalTraitsLoading } =
    useQuery(TraitsDocument);
  const { result: traySkillsResult, loading: traySkillsLoading } = useQuery(
    TraySkillsDocument,
  );
  const { result: setsResult } = useQuery(SetBonusesDocument);
  const { result: modifiersResult } = useQuery(ModifiersDocument);

  const ship = computed(() => shipResult.value?.ship ?? null);
  const fleetShips = computed(() => {
    const byId = new Map(
      (shipsResult.value?.ships ?? []).map((row) => [row.id, row]),
    );
    if (ship.value) byId.set(ship.value.id, ship.value);
    return [...byId.values()];
  });

  const catalogItems = computed(() =>
    buildLoadoutCatalog({
      items: itemsResult.value?.infoboxes,
      starshipTraits: traitsResult.value?.starshipTraits,
      traits: personalTraitsResult.value?.traits,
      traySkills: traySkillsResult.value?.traySkills,
    }),
  );

  const itemByKey = computed(() => indexLoadoutItemsByKey(catalogItems.value));

  const modifierCatalog = computed<LoadoutModifier[]>(
    () => modifiersResult.value?.modifiers ?? [],
  );

  const catalogBindSources = computed(() => ({
    ships: fleetShips.value,
    starshipTraits: traitsResult.value?.starshipTraits ?? [],
    items: itemsResult.value?.infoboxes ?? [],
  }));

  function bindForEntry(entry: CollectionEntry) {
    return resolvedBindForEntry(
      entry,
      bindScopeFromCatalog(
        catalogBindSources.value,
        entry.kind,
        entry.catalogId,
      ),
    );
  }

  const ownedShipIds = computed(() =>
    visibleCatalogIds(state.value, "ship", bindForEntry),
  );

  const ownedKeys = computed(() => {
    const keys = ownedKeysIncludingHullGrants({
      ownedItemIds: visibleCatalogIds(state.value, "item", bindForEntry),
      ownedTraitIds: visibleCatalogIds(
        state.value,
        "starshipTrait",
        bindForEntry,
      ),
      ownedShipIds: ownedShipIds.value,
      ships: fleetShips.value,
      traits: traitsResult.value?.starshipTraits ?? [],
      items: itemsResult.value?.infoboxes ?? [],
    });
    for (const id of visibleCatalogIds(state.value, "trait", bindForEntry)) {
      keys.add(captainTraitOwnershipKey("trait", id));
    }
    return keys;
  });

  const loading = computed(
    () =>
      shipLoading.value ||
      itemsLoading.value ||
      traitsLoading.value ||
      personalTraitsLoading.value ||
      traySkillsLoading.value,
  );

  return {
    ship,
    shipError,
    fleetShips,
    catalogItems,
    itemByKey,
    modifierCatalog,
    catalogBindSources,
    ownedShipIds,
    ownedKeys,
    setBonusSources: computed(() => setsResult.value?.setBonuses ?? []),
    starshipTraits: computed(() => traitsResult.value?.starshipTraits ?? []),
    loading,
  };
}
