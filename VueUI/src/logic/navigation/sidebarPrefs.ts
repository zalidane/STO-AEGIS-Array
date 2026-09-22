/** Default matches today's icon-rail sidebar. */
export const DEFAULT_SIDEBAR_EXPANDED = false;

export type SidebarPrefs = {
  expanded: boolean;
};

export function sanitizeSidebarExpanded(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return DEFAULT_SIDEBAR_EXPANDED;
}

export function sanitizeSidebarPrefs(value: unknown): SidebarPrefs {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return { expanded: DEFAULT_SIDEBAR_EXPANDED };
  }
  const row = value as Record<string, unknown>;
  return { expanded: sanitizeSidebarExpanded(row.expanded) };
}
