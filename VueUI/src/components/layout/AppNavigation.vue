<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { storeToRefs } from "pinia";
import { useCompareStore } from "@/stores/compare";
import { APP_NAV_ITEMS } from "@/logic/navigation/navItems";
import { getSidebarPrefsRepository } from "@/models/navigation/sidebarPrefsRepository";

const compare = useCompareStore();
const { count, path } = storeToRefs(compare);

const prefsRepo = getSidebarPrefsRepository();
const expanded = ref(prefsRepo.load().expanded);

watch(expanded, (value) => {
  prefsRepo.save({ expanded: value });
});

const rail = computed(() => !expanded.value);

function toggleExpanded() {
  expanded.value = !expanded.value;
}

function itemTo(item: (typeof APP_NAV_ITEMS)[number]): string {
  return item.to === "compare" ? path.value : item.to;
}
</script>

<template>
  <v-navigation-drawer
    permanent
    :rail="rail"
    :expand-on-hover="rail"
    :width="256"
    class="app-navigation"
  >
    <div class="app-nav-brand">
      <RouterLink
        to="/"
        class="app-nav-brand__link"
        title="STO_AEGIS"
        aria-label="STO_AEGIS home"
      >
        <img
          class="app-nav-brand__icon"
          src="/favicon.svg"
          width="28"
          height="28"
          alt=""
        />
        <span class="app-nav-brand__title">STO_AEGIS</span>
      </RouterLink>
    </div>

    <v-list nav density="comfortable" class="app-nav-list">
      <v-list-item
        v-for="item in APP_NAV_ITEMS"
        :key="item.title"
        :to="itemTo(item)"
        :prepend-icon="item.icon"
        :title="item.title"
        :subtitle="
          item.to === 'compare' && count > 0 ? `${count} of 2` : undefined
        "
      />
    </v-list>

    <template #append>
      <div class="app-nav-toggle">
        <v-btn
          class="app-nav-toggle__btn"
          :icon="expanded ? 'mdi-chevron-left' : 'mdi-chevron-right'"
          variant="text"
          density="comfortable"
          :aria-label="expanded ? 'Collapse sidebar' : 'Expand sidebar'"
          :aria-pressed="expanded"
          @click.stop.prevent="toggleExpanded"
        />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.app-nav-brand {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  /* Match v-app-bar header band so sidebar + main share the same top edge. */
  height: var(--v-toolbar-height, 64px);
  min-height: var(--v-toolbar-height, 64px);
  padding-inline: 14px;
  overflow: hidden;
  border-bottom: 1px solid rgba(63, 167, 255, 0.14);
}

.app-nav-brand__link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.app-nav-brand__icon {
  flex: 0 0 auto;
  display: block;
  border-radius: 6px;
}

.app-nav-brand__title {
  font-family: Orbitron, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: rgba(232, 242, 255, 0.96);
}

.app-nav-list {
  padding-top: 0.25rem;
}

.app-nav-toggle {
  display: flex;
  /* Keep the control under the rail icons so expand-on-hover does not shift the hit target. */
  justify-content: flex-start;
  padding: 0.35rem 0 0.55rem 4px;
  border-top: 1px solid rgba(63, 167, 255, 0.14);
}

.app-nav-toggle__btn {
  min-width: 48px !important;
  width: 48px;
}
</style>
