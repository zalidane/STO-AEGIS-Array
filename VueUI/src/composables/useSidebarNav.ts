import { computed, ref, watch, type Ref } from "vue";
import { useDisplay } from "vuetify";
import { getSidebarPrefsRepository } from "@/models/navigation/sidebarPrefsRepository";
import {
  SIDEBAR_HOVER_EXPAND_MEDIA_QUERY,
  shouldExpandOnHover,
  shouldUseOverlayDrawer,
  shouldUsePermanentDrawer,
  shouldUseRail,
} from "@/logic/navigation/sidebarInteraction";
import { useMediaQuery } from "@/composables/useMediaQuery";

const prefsRepo = getSidebarPrefsRepository();
const expanded: Ref<boolean> = ref(prefsRepo.load().expanded);
/** Overlay peek / open state (ignored while the drawer is permanent). */
const drawerOpen: Ref<boolean> = ref(true);

watch(expanded, (value) => {
  prefsRepo.save({ expanded: value });
});

/** Shared sticky sidebar expand state (localStorage-backed). */
export function useSidebarNav() {
  const display = useDisplay();
  const hoverCapable = useMediaQuery(SIDEBAR_HOVER_EXPAND_MEDIA_QUERY);

  const overlay = computed(() =>
    shouldUseOverlayDrawer(display.width.value),
  );
  const permanent = computed(() =>
    shouldUsePermanentDrawer(overlay.value, expanded.value),
  );
  const rail = computed(() =>
    shouldUseRail(overlay.value, expanded.value),
  );
  const expandOnHover = computed(() =>
    shouldExpandOnHover(rail.value, hoverCapable.value),
  );
  const showNavMenu = computed(
    () => overlay.value && !permanent.value && !drawerOpen.value,
  );
  /** Main content should treat the shell as expanded when the drawer is pinned open. */
  const shellExpanded = computed(
    () => expanded.value && (permanent.value || drawerOpen.value),
  );

  watch(
    [overlay, expanded, permanent],
    () => {
      if (permanent.value) {
        drawerOpen.value = true;
        return;
      }
      // Overlay + not pinned: start closed (hamburger opens a temporary peek).
      if (overlay.value && !expanded.value) {
        drawerOpen.value = false;
      }
    },
    { immediate: true },
  );

  function toggleExpanded() {
    expanded.value = !expanded.value;
  }

  function openOverlayDrawer() {
    drawerOpen.value = true;
  }

  function closeOverlayDrawer() {
    if (!permanent.value) {
      drawerOpen.value = false;
    }
  }

  return {
    expanded,
    shellExpanded,
    rail,
    overlay,
    permanent,
    expandOnHover,
    drawerOpen,
    showNavMenu,
    toggleExpanded,
    openOverlayDrawer,
    closeOverlayDrawer,
  };
}
