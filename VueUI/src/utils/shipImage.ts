import { getWikiImageUrl } from "@/utils/wikiImage";

/** Shipped with the app. Not part of the wiki image tree synced to object storage. */
const FALLBACK_SHIP_IMAGE = "/placeholders/ship-placeholder.png";

export function getShipImageUrl(
  imageField: string | null | undefined,
  fallback: string = FALLBACK_SHIP_IMAGE,
): string {
  return getWikiImageUrl("ships", imageField, fallback);
}

export { FALLBACK_SHIP_IMAGE };
