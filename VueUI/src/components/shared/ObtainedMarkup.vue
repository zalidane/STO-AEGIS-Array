<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useApolloClient, useQuery } from "@vue/apollo-composable";
import {
  InfoboxesByNameDocument,
  SearchDocument,
  ShipsDocument,
} from "@/graphql/generated/graphql";
import {
  collectObtainedLinkPages,
  parseObtainedMarkup,
  type ObtainedToken,
} from "@/logic/parseObtainedMarkup";
import {
  layoutObtainedBlocks,
  type ObtainedFactionMark,
} from "@/logic/layoutObtainedBlocks";
import {
  buildNameIdMap,
  buildShipRefMap,
  lookupShipRef,
  normalizeLookupKey,
  resolveObtainedLink,
  type ObtainedLinkTarget,
} from "@/logic/resolveObtainedLinks";
import {
  factionMarkKey,
  resolveFactionThemeColor,
  resolvePrimaryFaction,
  type FactionIdentity,
} from "@/logic/resolvePrimaryFaction";

const props = defineProps<{
  text: string | null | undefined;
  /** Ships already known to grant this trait (preferred matches). */
  ships?: ReadonlyArray<
    {
      id: number;
      name: string;
      displayClass?: string | null;
      displayPrefix?: string | null;
      displayType?: string | null;
    } & FactionIdentity
  >;
}>();

const { client } = useApolloClient();
const { result: shipsResult } = useQuery(ShipsDocument);

const tokens = computed(() => parseObtainedMarkup(props.text));

const linkRoutes = ref<Record<string, string | null>>({});

type ShipRef = {
  id: number;
  name: string;
  displayClass?: string | null;
  displayPrefix?: string | null;
  displayType?: string | null;
} & FactionIdentity;

const shipsByName = computed(() =>
  buildShipRefMap<ShipRef>([
    ...(shipsResult.value?.ships ?? []),
    ...(props.ships ?? []),
  ]),
);

const shipMap = computed(() =>
  buildNameIdMap(
    [...shipsByName.value.values()].map((ship) => ({
      id: ship.id,
      name: ship.name,
      displayClass: ship.displayClass,
      displayPrefix: ship.displayPrefix,
      displayType: ship.displayType,
    })),
  ),
);

function shipForPage(page: string): ShipRef | undefined {
  return lookupShipRef(shipsByName.value, page);
}

function shipLinkClass(page: string): string {
  const ship = shipForPage(page);
  if (!ship) return "";
  return `text-${resolveFactionThemeColor(ship)}`;
}

function markFromShip(ship: ShipRef | undefined): ObtainedFactionMark | null {
  if (!ship) return null;
  const primary = resolvePrimaryFaction(ship);
  if (!primary) return null;
  const key = factionMarkKey(primary);
  const letter =
    key === "federation"
      ? "F"
      : key === "klingon"
        ? "K"
        : key === "romulan"
          ? "R"
          : key === "dominion"
            ? "D"
            : key === "cross"
              ? "C"
              : "";
  if (!letter) return null;
  return {
    letter,
    color: resolveFactionThemeColor(ship),
    title: primary,
  };
}

const blocks = computed(() =>
  layoutObtainedBlocks(tokens.value, shipForPage, markFromShip),
);

function routeFor(page: string): string | null {
  return linkRoutes.value[page] ?? null;
}

function toPath(
  route: ReturnType<typeof resolveObtainedLink>,
): string | null {
  if (!route) return null;
  if (typeof route === "string") return route;
  if ("path" in route && typeof route.path === "string") return route.path;
  if ("name" in route && route.params && "id" in (route.params as object)) {
    const id = (route.params as { id: number }).id;
    switch (route.name) {
      case "ship-details":
        return `/ships/${id}`;
      case "item-details":
        return `/items/${id}`;
      case "infobox-details":
        return `/items/${id}`;
      case "trait-details":
        return `/traits/${id}`;
      case "starship-trait-details":
        return `/starship-traits/${id}`;
      case "reputation-details":
        return `/reputations/${id}`;
      case "mastery-details":
        return `/masteries/${id}`;
      case "tray-skill-details":
        return `/tray-skills/${id}`;
      default:
        return null;
    }
  }
  return null;
}

watch(
  [tokens, shipMap],
  async ([nextTokens, nextShipMap]) => {
    const pages = collectObtainedLinkPages(nextTokens);
    const nextRoutes: Record<string, string | null> = {};
    const pending: string[] = [];

    for (const page of pages) {
      const sync = resolveObtainedLink(page, { shipsByName: nextShipMap });
      const path = toPath(sync);
      if (path) {
        nextRoutes[page] = path;
      } else {
        pending.push(page);
      }
    }

    for (const page of pending) {
      try {
        const infoboxResult = await client.query({
          query: InfoboxesByNameDocument,
          variables: { name: page },
          fetchPolicy: "cache-first",
        });
        const infoboxes = infoboxResult.data?.infoboxesByName ?? [];
        const exact = infoboxes.find(
          (item: { name: string }) =>
            normalizeLookupKey(item.name) === normalizeLookupKey(page),
        );
        if (exact) {
          nextRoutes[page] = `/items/${exact.id}`;
          continue;
        }

        const searchResult = await client.query({
          query: SearchDocument,
          variables: { text: page },
          fetchPolicy: "cache-first",
        });
        const hits = (searchResult.data?.search ?? []) as ObtainedLinkTarget[];
        const exactHit = hits.find(
          (hit) =>
            normalizeLookupKey(hit.name) === normalizeLookupKey(page) &&
            hit.type !== "StarshipTrait",
        );
        if (exactHit) {
          const resolved = resolveObtainedLink(page, {
            shipsByName: nextShipMap,
            searchHitsByName: new Map([
              [normalizeLookupKey(exactHit.name), exactHit],
            ]),
          });
          nextRoutes[page] = toPath(resolved);
        } else {
          nextRoutes[page] = null;
        }
      } catch {
        nextRoutes[page] = null;
      }
    }

    linkRoutes.value = { ...linkRoutes.value, ...nextRoutes };
  },
  { immediate: true },
);

function renderInlineToken(token: ObtainedToken): ObtainedToken | null {
  if (token.type === "bullet" || token.type === "break") return null;
  return token;
}

function factionLetterFromToken(
  faction: Extract<ObtainedToken, { type: "factionIcon" }>["faction"],
): { letter: string; color: string } {
  switch (faction) {
    case "federation":
    case "fed-allies":
      return { letter: "F", color: "federation" };
    case "klingon":
    case "kdf-allies":
      return { letter: "K", color: "klingon" };
    case "romulan":
      return { letter: "R", color: "romulan" };
    case "dominion":
      return { letter: "D", color: "dominion" };
    case "cross":
    default:
      return { letter: "C", color: "neutral" };
  }
}
</script>

<template>
  <div class="obtained-markup">
    <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
      <div v-if="block.kind === 'shipGroup'" class="obtained-ship-group">
        <span
          v-if="block.mark"
          class="obtained-faction-mark obtained-faction-mark--boxed"
          :class="`text-${block.mark.color}`"
          :title="block.mark.title"
        >
          {{ block.mark.letter }}
        </span>

        <div class="obtained-ship-list">
          <template v-for="ship in block.ships" :key="ship.page">
            <RouterLink
              v-if="routeFor(ship.page)"
              :to="routeFor(ship.page)!"
              class="obtained-link obtained-ship-name"
              :class="shipLinkClass(ship.page)"
            >
              {{ ship.label }}
            </RouterLink>
            <span
              v-else
              class="obtained-ship-name"
              :class="shipLinkClass(ship.page)"
              :title="ship.page"
            >
              {{ ship.label }}
            </span>
          </template>
        </div>
      </div>

      <div v-else class="obtained-inline">
        <template v-for="(token, tokenIndex) in block.tokens" :key="tokenIndex">
          <template v-if="renderInlineToken(token)">
            <span v-if="tokenIndex > 0">{{ " " }}</span>
            <span
              v-if="token.type === 'factionIcon'"
              class="obtained-faction-mark"
              :class="`text-${factionLetterFromToken(token.faction).color}`"
              :title="token.title"
            >{{ factionLetterFromToken(token.faction).letter }}</span>

            <span
              v-else-if="token.type === 'rarityIcon'"
              class="obtained-faction-mark text-secondary"
              :title="token.title ?? 'Very rare'"
            >V</span>

            <RouterLink
              v-else-if="token.type === 'link' && routeFor(token.page)"
              :to="routeFor(token.page)!"
              class="obtained-link"
              :class="shipLinkClass(token.page)"
            >{{ token.label }}</RouterLink>

            <span
              v-else-if="token.type === 'link'"
              :class="shipLinkClass(token.page)"
              :title="token.page"
            >{{ token.label }}</span>

            <span v-else-if="token.type === 'text'">{{ token.value }}</span>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.obtained-markup {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.obtained-ship-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.obtained-ship-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}

.obtained-ship-name {
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.3;
}

.obtained-inline {
  display: block;
  line-height: 1.4;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.obtained-inline > :deep(a),
.obtained-inline > span {
  display: inline;
}

.obtained-inline .obtained-faction-mark {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 0.2em;
}

.obtained-faction-mark {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15em;
  font-family: "Orbitron", "Eurostile", "Bank Gothic", "Microgramma", sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

.obtained-faction-mark--boxed {
  align-self: center;
  min-width: 1.55em;
  height: 1.55em;
  padding: 0 0.15em;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 1.05rem;
}

.obtained-link {
  text-decoration: none;
  font-weight: 600;
}

.obtained-link:not([class*="text-"]) {
  color: rgb(var(--v-theme-primary));
}

.obtained-link:hover {
  text-decoration: underline;
}
</style>
