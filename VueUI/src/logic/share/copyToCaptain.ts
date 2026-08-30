import type { CollectionClock, CollectionState } from "@/logic/collection/types";
import { defaultCollectionClock } from "@/logic/collection/types";
import { importSharedLoadout } from "@/logic/loadout/state";
import type { CollectionLoadout, LoadoutSlotFill } from "@/logic/loadout/types";
import {
  resolveShareSlots,
  type ShareCatalogItem,
  type SharePayload,
} from "./payload";

export type ShareShipRef = {
  id: number;
  wikiName: string;
};

export type CopyShareResult =
  | {
      ok: true;
      loadout: CollectionLoadout;
      state: CollectionState;
      unresolved: string[];
    }
  | {
      ok: false;
      reason: "no-character" | "unknown-ship";
    };

export function copyShareToCaptain(
  state: CollectionState,
  input: {
    payload: SharePayload;
    items: ReadonlyArray<ShareCatalogItem>;
    ships: ReadonlyArray<ShareShipRef>;
  },
  clock: CollectionClock = defaultCollectionClock(),
): CopyShareResult {
  if (!state.activeCharacterId) return { ok: false, reason: "no-character" };
  const ship =
    input.ships.find((row) => row.wikiName === input.payload.shipName) ?? null;
  if (!ship) return { ok: false, reason: "unknown-ship" };

  const resolved = resolveShareSlots(input.payload, input.items);
  const slots: LoadoutSlotFill[] = resolved.slots;
  const next = importSharedLoadout(
    state,
    {
      shipId: ship.id,
      name: input.payload.title,
      slots,
    },
    clock,
  );
  const loadout = next.loadouts[next.loadouts.length - 1];
  if (!loadout) return { ok: false, reason: "no-character" };
  return {
    ok: true,
    loadout,
    state: next,
    unresolved: resolved.unresolved,
  };
}
