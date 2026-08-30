<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import { storeToRefs } from "pinia";
import {
  InfoboxesDocument,
  ShipsDocument,
  StarshipTraitsDocument,
  TraitsDocument,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import { useCollectionStore } from "@/stores/collection";
import {
  resolvedBindForEntry,
  visibleEntriesForActiveCharacter,
} from "@/logic/collection/state";
import {
  allowsAccountUnlockFromCatalog,
  bindChoicePromptFromCatalog,
  bindScopeFromCatalog,
} from "@/logic/collection/catalogBind";
import type {
  BindScope,
  CatalogKind,
  CollectionEntry,
} from "@/logic/collection/types";
import { displayInfoboxType } from "@/logic/collection/itemBrowser";
import {
  collectionKindEmptyCopy,
  groupCollectionByKind,
  resolveCollectionTab,
} from "@/logic/collection/kindTabs";
import { getShipImageUrl } from "@/utils/shipImage";
import {
  getItemImageUrl,
  getStarshipTraitImageUrl,
  getTraitImageUrl,
} from "@/utils/wikiImage";
import WikiIcon from "@/components/shared/WikiIcon.vue";

const route = useRoute();
const router = useRouter();
const store = useCollectionStore();
const { activeCharacter, state } = storeToRefs(store);

const { result: shipsResult } = useQuery(ShipsDocument);
const { result: traitsResult } = useQuery(TraitsDocument);
const { result: starshipResult } = useQuery(StarshipTraitsDocument);
const { result: itemsResult } = useQuery(InfoboxesDocument);

type Row = {
  entry: CollectionEntry;
  name: string;
  subtitle: string;
  to: string;
  imageSrc: string | null;
  bind: BindScope;
  allowAccountUnlock: boolean;
  bindChoicePrompt: string;
  ownedByActive: boolean;
  ownerName: string;
};

function lookupName(
  kind: CatalogKind,
  id: number,
): { name: string; subtitle: string; boundto?: string | null; imageSrc: string | null } {
  if (kind === "ship") {
    const ship = shipsResult.value?.ships.find((row) => row.id === id);
    return {
      name: ship?.name ?? `Ship #${id}`,
      subtitle: [ship?.type, ship?.tier != null ? `Tier ${ship.tier}` : null]
        .filter(Boolean)
        .join(" · "),
      imageSrc: getShipImageUrl(ship?.image),
    };
  }
  if (kind === "trait") {
    const trait = traitsResult.value?.traits.find((row) => row.id === id);
    return {
      name: trait?.name ?? `Trait #${id}`,
      subtitle: [trait?.type, trait?.environment].filter(Boolean).join(" · "),
      imageSrc: getTraitImageUrl(trait?.name, trait?.iconName),
    };
  }
  if (kind === "starshipTrait") {
    const trait = starshipResult.value?.starshipTraits.find(
      (row) => row.id === id,
    );
    return {
      name: trait?.name ?? `Starship trait #${id}`,
      subtitle: trait?.type ?? "",
      imageSrc: getStarshipTraitImageUrl(trait?.name, trait?.iconName),
    };
  }
  const item = itemsResult.value?.infoboxes.find((row) => row.id === id);
  return {
    name: item?.name ?? `Item #${id}`,
    subtitle: [displayInfoboxType(item?.type), item?.rarity]
      .filter(Boolean)
      .join(" · "),
    boundto: item?.boundto,
    imageSrc: getItemImageUrl(item?.image, item?.name),
  };
}

function detailsPath(kind: CatalogKind, id: number): string {
  if (kind === "ship") return `/ships/${id}`;
  if (kind === "trait") return `/traits/${id}`;
  if (kind === "starshipTrait") return `/starship-traits/${id}`;
  return `/items/${id}`;
}

const catalogSources = computed(() => ({
  ships: shipsResult.value?.ships ?? [],
  starshipTraits: starshipResult.value?.starshipTraits ?? [],
  items: itemsResult.value?.infoboxes ?? [],
}));

const rows = computed<Row[]>(() => {
  const sources = catalogSources.value;
  const visible = visibleEntriesForActiveCharacter(state.value, (entry) =>
    resolvedBindForEntry(
      entry,
      bindScopeFromCatalog(sources, entry.kind, entry.catalogId),
    ),
  );

  return visible.map((entry) => {
    const info = lookupName(entry.kind, entry.catalogId);
    const owner = state.value.characters.find(
      (character) => character.id === entry.characterId,
    );
    const catalogBind = bindScopeFromCatalog(
      sources,
      entry.kind,
      entry.catalogId,
    );
    return {
      entry,
      name: info.name,
      subtitle: info.subtitle,
      to: detailsPath(entry.kind, entry.catalogId),
      imageSrc: info.imageSrc,
      bind: resolvedBindForEntry(entry, catalogBind),
      allowAccountUnlock: allowsAccountUnlockFromCatalog(
        sources,
        entry.kind,
        entry.catalogId,
      ),
      bindChoicePrompt: bindChoicePromptFromCatalog(
        sources,
        entry.kind,
        entry.catalogId,
      ),
      ownedByActive: entry.characterId === state.value.activeCharacterId,
      ownerName: owner?.name ?? "Unknown captain",
    };
  });
});

const tabs = computed(() =>
  groupCollectionByKind(rows.value, (row) => row.entry.kind),
);

const requestedTab = computed(() =>
  typeof route.query.tab === "string" ? route.query.tab : "",
);

const activeTab = ref<CatalogKind>(resolveCollectionTab(requestedTab.value));

watch(requestedTab, (tab) => {
  const next = resolveCollectionTab(tab);
  if (next !== activeTab.value) activeTab.value = next;
});

watch(activeTab, (kind) => {
  if (kind === requestedTab.value) return;
  void router.replace({ query: { ...route.query, tab: kind } });
});

const activeGroup = computed(
  () => tabs.value.find((tab) => tab.kind === activeTab.value) ?? tabs.value[0],
);
</script>

<template>
  <app-breadcrumbs />
  <v-container class="collection-page" fluid>
    <header class="collection-header">
      <div class="collection-header__eyebrow">STO-AEGIS Array // Armory</div>
      <h1 class="collection-header__title">Collection</h1>
      <p class="collection-header__lede">
        {{
          activeCharacter
            ? `Items marked collected for ${activeCharacter.name}. Bound-to-account pieces from other captains stay visible.`
            : "Create a captain in the header to start a collection on this device."
        }}
      </p>
    </header>

    <div v-if="!activeCharacter" class="empty-featured">
      No captain selected.
    </div>

    <template v-else>
      <v-tabs
        v-model="activeTab"
        color="primary"
        bg-color="transparent"
        show-arrows
        class="collection-tabs"
      >
        <v-tab v-for="tab in tabs" :key="tab.kind" :value="tab.kind">
          <v-icon start :icon="tab.icon" />
          {{ tab.label }}
          <span class="collection-tabs__count">{{ tab.rows.length }}</span>
        </v-tab>
      </v-tabs>

      <div v-if="!activeGroup || activeGroup.rows.length === 0" class="empty-featured">
        {{
          activeGroup
            ? collectionKindEmptyCopy(activeGroup.kind)
            : "Nothing collected yet."
        }}
      </div>

      <div v-else class="collection-list">
        <RouterLink
          v-for="row in activeGroup.rows"
          :key="row.entry.id"
          :to="row.to"
          class="collection-row"
        >
          <div class="collection-row__main">
            <WikiIcon :src="row.imageSrc" :alt="row.name" :size="40" />
            <div>
              <div class="collection-row__name">{{ row.name }}</div>
              <div class="collection-row__meta">
                {{ row.subtitle }}
                <span v-if="!row.ownedByActive"> · On {{ row.ownerName }}</span>
              </div>
            </div>
          </div>
          <div class="collection-row__actions">
            <v-btn
              v-if="row.entry.kind === 'ship'"
              :to="`/ships/${row.entry.catalogId}/loadout`"
              size="small"
              variant="text"
              color="primary"
              @click.stop
            >
              Build
            </v-btn>
            <CollectToggle
              :kind="row.entry.kind"
              :catalog-id="row.entry.catalogId"
              :bind="row.bind"
              :allow-account-unlock="row.allowAccountUnlock"
              :bind-choice-prompt="row.bindChoicePrompt"
            />
          </div>
        </RouterLink>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.collection-page {
  max-width: 1480px;
}

.collection-header {
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.55);
}

.collection-header__eyebrow {
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.collection-header__title {
  margin: 0 0 8px;
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.collection-header__lede {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.collection-tabs {
  margin-bottom: 0.85rem;
}

.collection-tabs__count {
  margin-left: 0.35rem;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.85em;
}

.collection-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.collection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 22, 36, 0.72);
}

.collection-row__main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.collection-row__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.collection-row__name {
  font-weight: 650;
}

.collection-row__meta {
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.86rem;
}

.empty-featured {
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}
</style>
