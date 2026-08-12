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
  type ObtainedFactionIcon,
  type ObtainedToken,
} from "@/logic/parseObtainedMarkup";
import {
  buildNameIdMap,
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
  ships?: ReadonlyArray<{ id: number; name: string } & FactionIdentity>;
}>();

const { client } = useApolloClient();
const { result: shipsResult } = useQuery(ShipsDocument);

const tokens = computed(() => parseObtainedMarkup(props.text));

const linkRoutes = ref<Record<string, string | null>>({});

type ShipRef = { id: number; name: string } & FactionIdentity;

const shipsByName = computed(() => {
  const map = new Map<string, ShipRef>();
  for (const ship of shipsResult.value?.ships ?? []) {
    map.set(normalizeLookupKey(ship.name), ship);
  }
  for (const ship of props.ships ?? []) {
    map.set(normalizeLookupKey(ship.name), ship);
  }
  return map;
});

const shipMap = computed(() =>
  buildNameIdMap(
    [...shipsByName.value.values()].map((ship) => ({
      id: ship.id,
      name: ship.name,
    })),
  ),
);

const FACTION_MARK: Record<
  ObtainedFactionIcon,
  { letter: string; color: string }
> = {
  federation: { letter: "F", color: "federation" },
  klingon: { letter: "K", color: "klingon" },
  romulan: { letter: "R", color: "romulan" },
  dominion: { letter: "D", color: "dominion" },
  cross: { letter: "C", color: "neutral" },
  "fed-allies": { letter: "F", color: "federation" },
  "kdf-allies": { letter: "K", color: "klingon" },
};

function factionMeta(faction: ObtainedFactionIcon) {
  return FACTION_MARK[faction];
}

function shipForPage(page: string): ShipRef | undefined {
  return shipsByName.value.get(normalizeLookupKey(page));
}

function shipLinkClass(page: string): string {
  const ship = shipForPage(page);
  if (!ship) return "";
  return `text-${resolveFactionThemeColor(ship)}`;
}

function markFromShip(ship: ShipRef | undefined): {
  letter: string;
  color: string;
  title?: string;
} | null {
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

/** Prefer factionLede-driven mark when the line references a known ship. */
function lineFactionOverride(line: ObtainedToken[]) {
  for (const token of line) {
    if (token.type !== "link") continue;
    const mark = markFromShip(shipForPage(token.page));
    if (mark) return mark;
  }
  return null;
}

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
      case "infobox-details":
        return `/infoboxes/${id}`;
      case "trait-details":
        return `/traits/${id}`;
      case "starship-trait-details":
        return `/starship-traits/${id}`;
      case "reputation-details":
        return `/reputations/${id}`;
      case "sw-obtain-details":
        return `/sw-obtains/${id}`;
      case "gw-obtain-details":
        return `/gw-obtains/${id}`;
      case "set-bonus-details":
        return `/set-bonuses/${id}`;
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
          nextRoutes[page] = `/infoboxes/${exact.id}`;
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

function lineGroups(allTokens: ObtainedToken[]): ObtainedToken[][] {
  const groups: ObtainedToken[][] = [[]];
  for (const token of allTokens) {
    if (token.type === "break") {
      groups.push([]);
      continue;
    }
    groups[groups.length - 1]!.push(token);
  }
  return groups.filter((line) => line.length > 0);
}

const lines = computed(() => lineGroups(tokens.value));

const lineFactionMarks = computed(() =>
  lines.value.map((line) => lineFactionOverride(line)),
);
</script>

<template>
  <div class="obtained-markup">
    <div v-for="(line, lineIndex) in lines" :key="lineIndex" class="obtained-line">
      <template v-for="(token, tokenIndex) in line" :key="tokenIndex">
        <span v-if="token.type === 'bullet'" class="obtained-bullet">•</span>

        <span
          v-else-if="token.type === 'factionIcon' && lineFactionMarks[lineIndex]"
          class="obtained-faction-mark"
          :class="`text-${lineFactionMarks[lineIndex]!.color}`"
          :title="lineFactionMarks[lineIndex]!.title"
        >
          {{ lineFactionMarks[lineIndex]!.letter }}
        </span>

        <span
          v-else-if="token.type === 'factionIcon'"
          class="obtained-faction-mark"
          :class="`text-${factionMeta(token.faction).color}`"
          :title="token.title"
        >
          {{ factionMeta(token.faction).letter }}
        </span>

        <span
          v-else-if="token.type === 'rarityIcon'"
          class="obtained-faction-mark text-secondary"
          :title="token.title ?? 'Very rare'"
        >
          V
        </span>

        <RouterLink
          v-else-if="token.type === 'link' && routeFor(token.page)"
          :to="routeFor(token.page)!"
          class="obtained-link"
          :class="shipLinkClass(token.page)"
        >
          {{ token.label }}
        </RouterLink>

        <span
          v-else-if="token.type === 'link'"
          class="obtained-link obtained-link--plain"
          :class="shipLinkClass(token.page)"
          :title="token.page"
        >
          {{ token.label }}
        </span>

        <span v-else-if="token.type === 'text'">{{ token.value }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.obtained-markup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.obtained-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  line-height: 1.35;
}

.obtained-bullet {
  color: rgba(255, 255, 255, 0.45);
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

.obtained-link--plain {
  font-weight: 500;
}
</style>
