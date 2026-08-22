const EQUIPMENT_INFOBOX_TYPES = new Set([
  "universal console",
  "ship engineering console",
  "ship tactical console",
  "ship science console",
  "ship fore weapon",
  "ship aft weapon",
  "ship weapon",
  "experimental weapon",
  "shuttle weapon",
  "hangar bay",
  "ship device",
  "ship shields",
  "ship vanity shield",
  "ship vanity shields",
  "impulse engine",
  "warp engine",
  "singularity engine",
  "ship deflector dish",
  "ship secondary deflector",
  "ground weapon",
  "ground device",
  "ground armor",
  "body armor",
  "personal shield",
  "kit",
  "kit module",
  "kit modules",
  "ev suit",
]);

export function isEquipmentInfoboxType(
  type: string | null | undefined,
): boolean {
  const normalized = type?.trim().toLowerCase();
  if (!normalized) return false;
  return EQUIPMENT_INFOBOX_TYPES.has(normalized);
}

export function filterEquipmentInfoboxes<T extends { type?: string | null }>(
  items: readonly T[],
): T[] {
  return items.filter((item) => isEquipmentInfoboxType(item.type));
}
