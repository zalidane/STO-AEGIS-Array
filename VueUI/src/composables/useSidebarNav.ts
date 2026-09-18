import { computed, ref, watch, type Ref } from "vue";
import { getSidebarPrefsRepository } from "@/models/navigation/sidebarPrefsRepository";

const prefsRepo = getSidebarPrefsRepository();
const expanded: Ref<boolean> = ref(prefsRepo.load().expanded);

watch(expanded, (value) => {
  prefsRepo.save({ expanded: value });
});

/** Shared sticky sidebar expand state (localStorage-backed). */
export function useSidebarNav() {
  const rail = computed(() => !expanded.value);

  function toggleExpanded() {
    expanded.value = !expanded.value;
  }

  return {
    expanded,
    rail,
    toggleExpanded,
  };
}
