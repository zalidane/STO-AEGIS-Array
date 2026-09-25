export type AppNavItem = {
  title: string;
  icon: string;
  /** Route path, or the sentinel `"compare"` for the dynamic compare path. */
  to: string;
};

/** Primary sidebar destinations. Secondary pages stay reachable via footer/in-app links. */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { title: "Home", icon: "mdi-home", to: "/" },
  { title: "Collection", icon: "mdi-bookmark", to: "/collection" },
  { title: "Loadouts", icon: "mdi-view-dashboard-outline", to: "/loadouts" },
  { title: "Ships", icon: "mdi-ferry", to: "/ships" },
  {
    title: "Ship Search",
    icon: "mdi-magnify-scan",
    to: "/ships/advanced",
  },
  { title: "Compare", icon: "mdi-compare-horizontal", to: "compare" },
  { title: "Traits", icon: "mdi-star-outline", to: "/traits" },
  { title: "Starship Traits", icon: "mdi-star", to: "/starship-traits" },
  { title: "Items", icon: "mdi-cube-outline", to: "/items" },
  { title: "Tray Skills", icon: "mdi-lightning-bolt", to: "/tray-skills" },
  { title: "Reputations", icon: "mdi-medal", to: "/reputations" },
  {
    title: "Pack Simulator",
    icon: "mdi-package-variant-closed",
    to: "/pack-simulator",
  },
  { title: "News", icon: "mdi-newspaper-variant-outline", to: "/news" },
] as const;

/** Titles intentionally omitted from the sidebar (routes remain registered). */
export const REMOVED_SIDEBAR_NAV_TITLES = [
  "Ship Types",
  "Masteries",
  "Modifiers",
  "About",
  "Attributions",
] as const;
