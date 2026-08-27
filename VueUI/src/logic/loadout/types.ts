export type LoadoutSlotFill = {
  slotId: string;
  itemId: number;
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
};

export type LoadoutEquipContext = {
  hullSlots: ReadonlyArray<{ id: string; kind: import("./slotClass").HullSlotKind }>;
  items: ReadonlyArray<LoadoutItem>;
  ownedItemIds: ReadonlySet<number>;
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
