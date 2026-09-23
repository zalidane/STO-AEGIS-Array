/**
 * Viewport / pointer rules for the sticky sidebar.
 *
 * Vuetify's default `md` threshold is 840px. iPad mini portrait (~744–768)
 * falls below that and must not rely on expand-on-hover.
 */
export const SIDEBAR_OVERLAY_MAX_WIDTH = 840;

/** True hover + fine pointer only — excludes sticky touch “hover”. */
export const SIDEBAR_HOVER_EXPAND_MEDIA_QUERY =
  "(hover: hover) and (pointer: fine)";

export function shouldExpandOnHover(
  rail: boolean,
  hoverCapable: boolean,
): boolean {
  return rail && hoverCapable;
}

export function shouldUseOverlayDrawer(
  viewportWidth: number,
  overlayMaxWidth: number = SIDEBAR_OVERLAY_MAX_WIDTH,
): boolean {
  return viewportWidth < overlayMaxWidth;
}

/**
 * Permanent layout drawer on desktop/tablet rail mode.
 * On overlay viewports, only permanent when the user pinned expanded.
 */
export function shouldUsePermanentDrawer(
  overlay: boolean,
  expanded: boolean,
): boolean {
  return !overlay || expanded;
}

/** Icon rail only when the drawer is in permanent layout mode and not pinned. */
export function shouldUseRail(overlay: boolean, expanded: boolean): boolean {
  return !overlay && !expanded;
}
