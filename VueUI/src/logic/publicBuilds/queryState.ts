export const PUBLIC_BUILDS_PAGE_SIZE = 24;

export const PUBLIC_BUILD_SORT_OPTIONS = [
  { value: "NEWEST", title: "Newest" },
  { value: "UPDATED", title: "Recently updated" },
  { value: "NAME", title: "Name" },
  { value: "FEATURED", title: "Most featured" },
] as const;

export type PublicBuildSortValue =
  (typeof PUBLIC_BUILD_SORT_OPTIONS)[number]["value"];

export const BUILDS_TABS = ["mine", "published"] as const;

export type BuildsTab = (typeof BUILDS_TABS)[number];

export const DEFAULT_BUILDS_TAB: BuildsTab = "mine";

export type PublicBuildsViewState = {
  search: string;
  shipName: string;
  faction: string;
  tier: number | null;
  sort: PublicBuildSortValue;
  page: number;
  tab: BuildsTab;
};

export const DEFAULT_PUBLIC_BUILDS_VIEW_STATE: PublicBuildsViewState = {
  search: "",
  shipName: "",
  faction: "",
  tier: null,
  sort: "NEWEST",
  page: 1,
  tab: DEFAULT_BUILDS_TAB,
};

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return typeof value === "string" ? value : "";
}

export function parseBuildsTab(value: unknown): BuildsTab {
  const raw = firstQueryValue(value).trim().toLowerCase();
  if (raw === "published" || raw === "public") return "published";
  if (raw === "mine" || raw === "my" || raw === "loadouts") return "mine";
  return DEFAULT_BUILDS_TAB;
}

function parsePage(value: unknown): number {
  const raw = firstQueryValue(value);
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseTier(value: unknown): number | null {
  const raw = firstQueryValue(value);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSort(value: unknown): PublicBuildSortValue {
  const raw = firstQueryValue(value);
  const match = PUBLIC_BUILD_SORT_OPTIONS.find((option) => option.value === raw);
  return match?.value ?? DEFAULT_PUBLIC_BUILDS_VIEW_STATE.sort;
}

export function parsePublicBuildsViewState(
  query: Record<string, unknown>,
): PublicBuildsViewState {
  return {
    search: firstQueryValue(query.q).trim(),
    shipName: firstQueryValue(query.ship).trim(),
    faction: firstQueryValue(query.faction).trim(),
    tier: parseTier(query.tier),
    sort: parseSort(query.sort),
    page: parsePage(query.page),
    tab: parseBuildsTab(query.tab),
  };
}

export function serializePublicBuildsViewState(
  state: PublicBuildsViewState,
): Record<string, string> {
  const query: Record<string, string> = {};
  if (state.search.trim()) query.q = state.search.trim();
  if (state.shipName.trim()) query.ship = state.shipName.trim();
  if (state.faction.trim()) query.faction = state.faction.trim();
  if (state.tier != null) query.tier = String(state.tier);
  if (state.sort !== DEFAULT_PUBLIC_BUILDS_VIEW_STATE.sort) {
    query.sort = state.sort;
  }
  if (state.page > 1) query.page = String(state.page);
  if (state.tab !== DEFAULT_BUILDS_TAB) query.tab = state.tab;
  return query;
}

export function publicBuildsOffset(page: number, pageSize = PUBLIC_BUILDS_PAGE_SIZE): number {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return (safePage - 1) * pageSize;
}

export function publicBuildsPageCount(
  totalCount: number,
  pageSize = PUBLIC_BUILDS_PAGE_SIZE,
): number {
  if (!Number.isFinite(totalCount) || totalCount <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function clampPublicBuildsPage(
  page: number,
  totalCount: number,
  pageSize = PUBLIC_BUILDS_PAGE_SIZE,
): number {
  const max = publicBuildsPageCount(totalCount, pageSize);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(max, Math.floor(page));
}

export function publicBuildsFiltersAreActive(state: PublicBuildsViewState): boolean {
  return (
    state.search.trim().length > 0 ||
    state.shipName.trim().length > 0 ||
    state.faction.trim().length > 0 ||
    state.tier != null
  );
}

export function formatPublicBuildDate(
  value: string | Date | null | undefined | unknown,
): string {
  if (value == null || value === "") return "";
  if (typeof value !== "string" && !(value instanceof Date)) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
