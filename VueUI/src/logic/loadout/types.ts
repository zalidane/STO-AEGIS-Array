export type LoadoutCatalogKind = "item" | "starshipTrait" | "trait";

export type LoadoutSlotFill = {
  slotId: string;
  itemId: number;
  /** Omitted on older saves; treated as an infobox item. */
  catalogKind?: LoadoutCatalogKind;
  /** Seated copy quality; independent of catalog rarity. */
  quality?: string;
  /** Seated copy mark level, e.g. XII. */
  mark?: string;
};

export type CollectionLoadout = {
  id: string;
  characterId: string;
  shipId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  slots: LoadoutSlotFill[];
};

export type LoadoutItem = {
  id: number;
  name: string;
  type: string | null;
  rarity?: string | null;
  image?: string | null;
  equiplimit?: number | null;
  catalogKind?: LoadoutCatalogKind;
  /** Wiki obtained / who text; used when no granting-ship cost exists. */
  who?: string | null;
  /** Infobox body copy used by the slot picker search. */
  searchText?: string | null;
  environment?: string | null;
  career?: string | null;
  required?: string | null;
};

export type LoadoutEquipContext = {
  hullSlots: ReadonlyArray<{
    id: string;
    kind: import("./slotClass").HullSlotKind;
    index: number;
  }>;
  items: ReadonlyArray<LoadoutItem>;
  ownedKeys: ReadonlySet<string>;
  /** When false, unowned catalog items may still be seated. Defaults to true. */
  requireOwned?: boolean;
};

export type EquipFailure =
  | "no-character"
  | "unknown-loadout"
  | "unknown-slot"
  | "unknown-item"
  | "not-owned"
  | "illegal-slot"
  | "equip-limit";

export type EquipResult =
  | { ok: true; loadout: CollectionLoadout }
  | { ok: false; reason: EquipFailure };
