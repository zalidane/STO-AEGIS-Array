import {
  parseBoffSeats,
  type BoffSeatView,
} from "@/mappers/boffColors";
import { abbreviateBoffPart } from "@/utils/formatters";

/**
 * Collection plain-text seat token from a Ship Details seat view.
 *
 * Chips show `careerLabel` (+ optional `specializationLabel`). Collection uses
 * the same strings, uppercased, with `/` before the specialization:
 * `CMDR TAC/MW`, `CMDR UNI/CMD`, `LTCMDR ENG` — never specialization-only
 * tokens like `CMDR-CMD`.
 */
export function formatCollectionBoffSeatView(seat: BoffSeatView): string {
  const base = seat.careerLabel.trim().toUpperCase();
  const spec = seat.specializationLabel?.trim().toUpperCase();
  if (!base) return spec ?? "";
  return spec ? `${base}/${spec}` : base;
}

/**
 * Build a Collection token from raw seat fields using the same
 * `abbreviateBoffPart` pieces as `toBoffSeatView`.
 */
export function formatCollectionBoffSeat(input: {
  rank: string;
  career: string;
  specialization?: string | null;
}): string {
  const rankAbbrev = abbreviateBoffPart(input.rank);
  const careerAbbrev = abbreviateBoffPart(input.career);
  const specializationAbbrev = input.specialization?.trim()
    ? abbreviateBoffPart(input.specialization)
    : undefined;

  return formatCollectionBoffSeatView({
    raw: "",
    rank: input.rank,
    careerName: input.career as BoffSeatView["careerName"],
    specializationName: input.specialization?.trim() || undefined,
    career: "universal",
    specialization: undefined,
    careerLabel: `${rankAbbrev} ${careerAbbrev}`.trim(),
    specializationLabel: specializationAbbrev,
    label: "",
  });
}

/** Pipe-separated Collection BOff line from parsed seat fields. */
export function formatHullBoffSummary(
  seats: ReadonlyArray<{
    rank: string;
    career: string;
    specialization?: string | null;
  }>,
): string {
  return seats.map(formatCollectionBoffSeat).join(" | ");
}

/**
 * Format a wiki `boffs` CSV via `parseBoffSeats` → Ship Details seat views
 * (same sort + labels as the builder chips).
 */
export function formatHullBoffSummaryFromRaw(
  boffs: string | null | undefined,
): string {
  return parseBoffSeats(boffs).map(formatCollectionBoffSeatView).join(" | ");
}
