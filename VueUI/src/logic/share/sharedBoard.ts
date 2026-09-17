import type { CaptainTraitGroup, CaptainTraitSlot } from "@/logic/loadout/captainTraits";
import {
  buildCaptainTraitSlots,
  groupCaptainTraitSlots,
  shipSpecificSectionLabel,
} from "@/logic/loadout/captainTraits";
import {
  boffPowerDisplayName,
  boffRankAbbrev,
  buildBoffStations,
  type BoffStation,
  type BoffStationSlot,
} from "@/logic/loadout/boffPowers";
import { asBoffPower } from "@/logic/loadout/catalogMap";
import type { LoadoutItem, LoadoutSlotFill } from "@/logic/loadout/types";
import { getBoffSeatColors, toBoffSeatView } from "@/mappers/boffColors";
import { abbreviateBoffPart } from "@/utils/formatters";

export type SharedCaptainTraitSlotView = {
  slot: CaptainTraitSlot;
  item: { name: string; image?: string | null } | null;
};

export type SharedCaptainTraitSection = {
  group: CaptainTraitGroup;
  label: string;
  slots: SharedCaptainTraitSlotView[];
};

export type SharedBoffStationSlotView = {
  slot: BoffStationSlot;
  item: { name: string; image?: string | null } | null;
};

export type SharedBoffStationRow = {
  station: BoffStation;
  label: string;
  careerLabel: string;
  specLabel?: string;
  careerTheme: string;
  specTheme?: string;
  slots: SharedBoffStationSlotView[];
};

function fillBySlotId(
  fills: ReadonlyArray<LoadoutSlotFill>,
): Map<string, LoadoutSlotFill> {
  const map = new Map<string, LoadoutSlotFill>();
  for (const fill of fills) {
    map.set(fill.slotId, fill);
  }
  return map;
}

/**
 * Space-trait board for a shared snapshot (personal / starship / reputation /
 * ship-specific). Identity is unknown on anonymous shares, so personal socket
 * count uses the default captain board.
 */
export function sharedCaptainTraitSections(input: {
  shipName?: string | null;
  hullTraitSlots?: ReadonlyArray<{
    id: string;
    index: number;
    locked?: boolean;
  }>;
  itemInSlot: (slotId: string) => LoadoutItem | null;
}): SharedCaptainTraitSection[] {
  const slots = buildCaptainTraitSlots({
    hullTraitSlots: input.hullTraitSlots,
  });
  return groupCaptainTraitSlots(slots).map((section) => ({
    group: section.group,
    label:
      section.group === "shipSpecific"
        ? shipSpecificSectionLabel(input.shipName)
        : section.label,
    slots: section.slots.map((slot) => {
      const item = input.itemInSlot(slot.id);
      return {
        slot,
        item: item ? { name: item.name, image: item.image } : null,
      };
    }),
  }));
}

/** Bridge-officer rows for a shared snapshot, including seated tray skills. */
export function sharedBoffStationRows(input: {
  boffs?: string | null;
  boffSeatCareers?: Record<string, "Tactical" | "Engineering" | "Science">;
  fills: ReadonlyArray<LoadoutSlotFill>;
  itemInSlot: (slotId: string) => LoadoutItem | null;
}): SharedBoffStationRow[] {
  const bySlot = fillBySlotId(input.fills);
  return buildBoffStations(input.boffs, input.boffSeatCareers).map((station) => {
    const view = toBoffSeatView(station.raw);
    const colors = getBoffSeatColors(station.seat);
    return {
      station,
      label: view.label,
      careerLabel: `${boffRankAbbrev(station.seat.rank)} ${abbreviateBoffPart(station.seat.career)}`,
      specLabel: view.specializationLabel,
      careerTheme: colors.career,
      specTheme: colors.specialization,
      slots: station.slots.map((slot) => {
        const fill = bySlot.get(slot.id) ?? null;
        const item = input.itemInSlot(slot.id);
        return {
          slot,
          item: item
            ? {
                name: boffPowerDisplayName(
                  asBoffPower(item),
                  slot.rank,
                  fill?.abilityRank,
                ),
                image: item.image,
              }
            : null,
        };
      }),
    };
  });
}
