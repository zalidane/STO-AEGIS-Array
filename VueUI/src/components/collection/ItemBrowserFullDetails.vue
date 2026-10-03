<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import { useRouter } from "vue-router";
import {
  InfoboxDocument,
  type InfoboxQuery,
} from "@/graphql/generated/graphql";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import { buildItemDetailSections } from "@/logic/collection/itemText";
import { publicUsageLabel } from "@/logic/share/usage";

const props = defineProps<{
  itemId: number;
}>();

const router = useRouter();
const { result, loading, error } = useQuery(InfoboxDocument, () => ({
  id: props.itemId,
}));

type Detail = NonNullable<InfoboxQuery["infobox"]>;
const item = computed<Detail | null>(() => result.value?.infobox ?? null);

const grantingShips = computed(() => {
  if (!item.value) return [];
  const byId = new Map<number, Detail["shipsWithConsole"][number]>();
  for (const ship of [
    ...item.value.shipsWithConsole,
    ...item.value.shipsWithExperimentalWeapon,
  ]) {
    byId.set(ship.id, ship);
  }
  return [...byId.values()];
});

const sections = computed(() =>
  item.value ? buildItemDetailSections(item.value) : [],
);

const usage = computed(() =>
  item.value ? publicUsageLabel(item.value.publicBuildCount) : null,
);

function openShip(id: number) {
  void router.push(`/ships/${id}`);
}
</script>

<template>
  <div class="item-detail">
    <loading-panel v-if="loading" message="Item details" />
    <v-alert v-else-if="error" type="error" density="compact" class="mb-3">
      {{ error.message }}
    </v-alert>
    <template v-else-if="item">
      <p v-if="usage" class="item-detail__usage">{{ usage }}</p>

      <section
        v-for="(section, index) in sections"
        :key="`${section.title}-${index}`"
        class="item-detail__section"
      >
        <h3 class="item-detail__title">{{ section.title }}</h3>
        <ul v-if="section.blocks.length" class="item-detail__blocks">
          <li
            v-for="(block, blockIndex) in section.blocks"
            :key="blockIndex"
            class="item-detail__block"
          >
            <span class="item-detail__text">{{ block.text }}</span>
            <sub v-if="block.subscript" class="item-detail__sub">{{
              block.subscript
            }}</sub>
          </li>
        </ul>
      </section>

      <section v-if="grantingShips.length" class="item-detail__section">
        <h3 class="item-detail__title">Granted by ships</h3>
        <ul class="item-detail__links">
          <li v-for="ship in grantingShips" :key="ship.id">
            <button type="button" class="item-detail__link" @click="openShip(ship.id)">
              {{ ship.name }}
            </button>
            <span class="item-detail__meta">Tier {{ ship.tier }}</span>
          </li>
        </ul>
      </section>

      <section v-if="item.gwLockBoxes.length" class="item-detail__section">
        <h3 class="item-detail__title">Ground lock boxes</h3>
        <ul class="item-detail__links">
          <li v-for="box in item.gwLockBoxes" :key="box.id">
            <span class="item-detail__text">{{ box.flavor }}</span>
            <span class="item-detail__meta">{{ box.cat }} · {{ box.type }}</span>
          </li>
        </ul>
      </section>

      <section v-if="item.swLockBoxes.length" class="item-detail__section">
        <h3 class="item-detail__title">Space lock boxes</h3>
        <ul class="item-detail__links">
          <li v-for="box in item.swLockBoxes" :key="box.id">
            <span class="item-detail__text">{{ box.flavor }}</span>
            <span class="item-detail__meta">{{ box.cat }} · {{ box.type }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.item-detail {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.item-detail__usage {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.item-detail__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.item-detail__title {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 650;
}

.item-detail__blocks,
.item-detail__links {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.item-detail__block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
}

.item-detail__text {
  margin: 0;
  white-space: pre-line;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
}

.item-detail__sub,
.item-detail__meta {
  font-size: 0.78em;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.58);
  font-style: italic;
}

.item-detail__link {
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  color: #7dd3fc;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.item-detail__link:hover {
  text-decoration: underline;
}
</style>
