import {
  parseBoffSeat,
  sortBoffSeatRaws,
  type BoffCareer,
  type BoffSeat,
} from "@/utils/parsers/boffSeat";
import { abbreviateBoff, abbreviateBoffPart } from "@/utils/formatters";

/** Vuetify theme color keys for bridge officer careers. */
export const boffCareerColors: Record<BoffCareer, string> = {
  Tactical: "tactical",
  Engineering: "engineering",
  Science: "science",
  Universal: "universal",
};

/**
 * Vuetify theme color keys for seat specializations.
 * STO hybrid seats: Command orange, Intel purple, Pilot light blue,
 * Temporal yellow, Miracle Worker green.
 */
export const boffSpecializationColors: Record<string, string> = {
  Command: "command",
  Intelligence: "intelligence",
  Intel: "intelligence",
  Pilot: "pilot",
  "Miracle Worker": "miracle",
  "Temporal Operative": "temporal",
  Temporal: "temporal",
};

export interface BoffSeatColors {
  career: string;
  specialization?: string;
}

export interface BoffSeatView extends BoffSeatColors {
  raw: string;
  rank: string;
  careerName: BoffCareer;
  specializationName?: string;
  careerLabel: string;
  specializationLabel?: string;
  label: string;
}

export function getBoffCareerColor(career: BoffCareer | string): string {
  return boffCareerColors[career as BoffCareer] ?? "neutral";
}

export function getBoffSpecializationColor(
  specialization: string | null | undefined,
): string | undefined {
  if (!specialization) return undefined;
  return boffSpecializationColors[specialization];
}

export function getBoffSeatColors(seat: BoffSeat | string): BoffSeatColors {
  const parsed = typeof seat === "string" ? parseBoffSeat(seat) : seat;

  return {
    career: getBoffCareerColor(parsed.career),
    specialization: getBoffSpecializationColor(parsed.specialization),
  };
}

export function toBoffSeatView(raw: string): BoffSeatView {
  const seat = parseBoffSeat(raw);
  const colors = getBoffSeatColors(seat);
  const rankAbbrev = abbreviateBoffPart(seat.rank);
  const careerAbbrev = abbreviateBoffPart(seat.career);
  const specializationAbbrev = seat.specialization
    ? abbreviateBoffPart(seat.specialization)
    : undefined;

  return {
    raw,
    rank: seat.rank,
    careerName: seat.career,
    specializationName: seat.specialization,
    career: colors.career,
    specialization: colors.specialization,
    careerLabel: `${rankAbbrev} ${careerAbbrev}`.trim(),
    specializationLabel: specializationAbbrev,
    label: abbreviateBoff(raw),
  };
}

export function parseBoffSeats(boffs: string | null | undefined): BoffSeatView[] {
  if (!boffs?.trim()) return [];

  const raws = boffs
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return sortBoffSeatRaws(raws).map(toBoffSeatView);
}
