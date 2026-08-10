const FALLBACK_SHIP_IMAGE = "/images/ships/ship-placeholder.png";

export function getShipImageUrl(
  imageField: string | null | undefined,
  fallback: string = FALLBACK_SHIP_IMAGE,
): string {
  if (!imageField) return fallback;

  const filename = imageField.replace("File:", "").replaceAll(" ", "_");
  return `/images/ships/${filename}`;
}

export { FALLBACK_SHIP_IMAGE };
