import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  canOpenCompare,
  comparePath,
  compareToggleLabel,
  isCompareSelected,
  normalizeCompareIds,
  toggleCompareId,
} from "@/logic/compare/selection";
import { getCompareRepository } from "@/models/compare";

export const useCompareStore = defineStore("compare", () => {
  const repository = getCompareRepository();
  const ids = ref<number[]>(normalizeCompareIds(repository.load()));

  function persist() {
    repository.save(ids.value);
  }

  function replace(next: number[]) {
    ids.value = normalizeCompareIds(next);
    persist();
  }

  function toggle(shipId: number) {
    ids.value = toggleCompareId(ids.value, shipId);
    persist();
  }

  function remove(shipId: number) {
    ids.value = ids.value.filter((id) => id !== shipId);
    persist();
  }

  function clear() {
    ids.value = [];
    persist();
  }

  const ready = computed(() => canOpenCompare(ids.value));
  const path = computed(() => comparePath(ids.value));
  const count = computed(() => ids.value.length);

  function selected(shipId: number) {
    return isCompareSelected(ids.value, shipId);
  }

  function labelFor(shipId: number) {
    return compareToggleLabel(ids.value, shipId);
  }

  return {
    ids,
    count,
    ready,
    path,
    toggle,
    remove,
    clear,
    replace,
    selected,
    labelFor,
  };
});
