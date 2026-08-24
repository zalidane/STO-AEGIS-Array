/**
 * Player-facing equipment types shown in the Items browser.
 * Keep in sync with VueUI/src/logic/collection/itemBrowser.ts.
 */
export const EQUIPMENT_INFOBOX_TYPES = [
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
] as const;

export function isEquipmentInfoboxType(
  type: string | null | undefined,
): boolean {
  const normalized = type?.trim().toLowerCase();
  if (!normalized) return false;
  return (EQUIPMENT_INFOBOX_TYPES as readonly string[]).includes(normalized);
}

/** Prisma `OR` of case-insensitive type equals for equipment infoboxes. */
export function equipmentInfoboxTypeWhere() {
  return {
    OR: EQUIPMENT_INFOBOX_TYPES.map((type) => ({
      type: { equals: type, mode: "insensitive" as const },
    })),
  };
}
