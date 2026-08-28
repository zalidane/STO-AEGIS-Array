export type LoadoutCatalogKind = "item" | "starshipTrait";

export type LoadoutSlotFill = {
  slotId: string;
  itemId: number;
  /** Omitted on older saves; treated as an infobox item. */
  catalogKind?: LoadoutCatalogKind;
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
};

export type LoadoutEquipContext = {
  hullSlots: ReadonlyArray<{ id: string; kind: import("./slotClass").HullSlotKind }>;
  items: ReadonlyArray<LoadoutItem>;
  ownedKeys: ReadonlySet<string>;
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
