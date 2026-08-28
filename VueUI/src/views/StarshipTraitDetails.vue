<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@vue/apollo-composable";
import {
  StarshipTraitDocument,
  type StarshipTraitQuery,
} from "@/graphql/generated/graphql";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import DetailFieldList from "@/components/shared/DetailFieldList.vue";
import ObtainedMarkup from "@/components/shared/ObtainedMarkup.vue";
import CollectToggle from "@/components/collection/CollectToggle.vue";
import {
  allowsAccountUnlockFromGrantingShips,
  bindScopeForKind,
} from "@/logic/collection/bind";
import { bindChoiceFromGrantingShips } from "@/logic/collection/bindChoice";

const route = useRoute();
const id = computed(() => Number(route.params.id));

const { result, loading, error } = useQuery(StarshipTraitDocument, () => ({
  id: id.value,
}));

type Detail = NonNullable<StarshipTraitQuery["starshipTrait"]>;
const trait = computed<Detail | null>(() => result.value?.starshipTrait ?? null);
const collectBind = computed(() =>
  bindScopeForKind({
    kind: "starshipTrait",
    grantingShipCosts: trait.value?.ships.map((ship) => ship.cost) ?? [],
  }),
);
const allowAccountUnlock = computed(() =>
  allowsAccountUnlockFromGrantingShips(trait.value?.ships ?? []),
);
const bindChoicePrompt = computed(() =>
  bindChoiceFromGrantingShips(trait.value?.ships ?? []).prompt,
);

const fields = computed(() => {
  if (!trait.value) return [];
  const t = trait.value;
  return [
    { label: "Type", value: t.type },
    { label: "Short", value: t.short },
    { label: "Basic", value: t.basic },
    { label: "Detailed", value: t.detailed },
  ];
});
</script>

<template>
  <v-container>
    <AppBreadcrumbs :title="trait?.name" />
    <loading-panel v-if="loading" :message="'Starship Trait Details'" />
    <v-alert v-else-if="error" type="error">{{ error.message }}</v-alert>
    <template v-else-if="trait">
      <div class="d-flex align-start justify-space-between ga-4 mb-4">
        <h3>{{ trait.name }}</h3>
        <CollectToggle
          kind="starshipTrait"
          :catalog-id="trait.id"
          :bind="collectBind"
          :allow-account-unlock="allowAccountUnlock"
          :bind-choice-prompt="bindChoicePrompt"
        />
      </div>

      <v-card class="mt-4 mb-4">
        <v-card-title>Details</v-card-title>
        <DetailFieldList :items="fields" />
      </v-card>

      <v-card v-if="trait.ships.length" class="mb-4">
        <v-card-title>Granted by ships</v-card-title>
        <v-list>
          <v-list-item
            v-for="ship in trait.ships"
            :key="ship.id"
            :to="`/ships/${ship.id}`"
          >
            <v-list-item-title>{{ ship.name }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>

      <v-card v-if="trait.obtained">
        <v-card-title>Obtained</v-card-title>
        <v-card-text>
          <ObtainedMarkup :text="trait.obtained" :ships="trait.ships" />
        </v-card-text>
      </v-card>
    </template>
    <v-alert v-else type="warning">Starship trait not found</v-alert>
  </v-container>
</template>
