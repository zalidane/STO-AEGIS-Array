import { watch, type MaybeRefOrGetter, toValue } from "vue";
import { useCollectionStore } from "@/stores/collection";

/** Re-point collected item ids when Infobox SERIAL ranges shift after a replace import. */
export function useAlignItemCatalog(
  infoboxes: MaybeRefOrGetter<ReadonlyArray<{ id: number }> | null | undefined>,
) {
  const store = useCollectionStore();
  watch(
    () => toValue(infoboxes),
    (rows) => {
      if (!rows?.length) return;
      store.alignCatalog("item", rows.map((row) => row.id));
    },
    { immediate: true },
  );
}
