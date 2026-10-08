/** Shipped with the app. Not part of the wiki image tree synced to object storage. */
export const FALLBACK_TRAIT_IMAGE = "/placeholders/trait-placeholder.png";
export const FALLBACK_STARSHIP_TRAIT_IMAGE =
  "/placeholders/starship-trait-placeholder.png";

/** Native STO wiki trait icon size. Scale only by integers to avoid blur. */
export const TRAIT_ICON_NATIVE_WIDTH = 49;
export const TRAIT_ICON_NATIVE_HEIGHT = 64;

/** 2× is the largest integer scale that stays reasonably sharp for 49×64 rasters. */
export const TRAIT_ICON_FEATURED_SCALE = 2;
export const TRAIT_ICON_FEATURED_WIDTH =
  TRAIT_ICON_NATIVE_WIDTH * TRAIT_ICON_FEATURED_SCALE;
export const TRAIT_ICON_FEATURED_HEIGHT =
  TRAIT_ICON_NATIVE_HEIGHT * TRAIT_ICON_FEATURED_SCALE;

/** Prefer the extracted wiki icon; use `fallback` when missing or after a load error. */
export function resolveTraitArtSrc(
  imageSrc: string | null | undefined,
  fallback: string | null | undefined,
  failed = false,
): string | null {
  if (!failed) {
    const src = imageSrc?.trim();
    if (src) return src;
  }
  return fallback?.trim() || null;
}
