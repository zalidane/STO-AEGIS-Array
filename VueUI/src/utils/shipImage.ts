import { getWikiImageUrl } from "@/utils/wikiImage";

const FALLBACK_SHIP_IMAGE = "/images/ships/ship-placeholder.png";

export function getShipImageUrl(
  imageField: string | null | undefined,
  fallback: string = FALLBACK_SHIP_IMAGE,
): string {
  return getWikiImageUrl("ships", imageField, fallback);
}

export { FALLBACK_SHIP_IMAGE };
