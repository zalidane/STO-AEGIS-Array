import {
  extraHullSlotSummary,
  type ExtraHullSlotShip,
} from "./hullExtras";

export type HullConsoleShip = ExtraHullSlotShip & {
  engineeringSlots?: number | null;
  scienceSlots?: number | null;
  tacticalSlots?: number | null;
};

export type HullConsoleCounts = {
  engineering: number;
  science: number;
  tactical: number;
  universal: number;
};

/** Console seat totals matching ship details / loadout hull extras. */
export function hullConsoleCounts(ship: HullConsoleShip): HullConsoleCounts {
  const extras = extraHullSlotSummary(ship);
  return {
    engineering: (ship.engineeringSlots ?? 0) + extras.engineeringConsoles,
    science: (ship.scienceSlots ?? 0) + extras.scienceConsoles,
    tactical: (ship.tacticalSlots ?? 0) + extras.tacticalConsoles,
    universal: extras.universalConsoles,
  };
}

export type HullConsoleSummaryPart = {
  count: number;
  label: "ENG" | "SCI" | "TAC" | "UNI";
  theme: "engineering" | "science" | "tactical" | "universal";
};

/** Ordered non-zero parts for compact summaries (ENG → SCI → TAC → UNI). */
export function hullConsoleSummaryParts(
  ship: HullConsoleShip,
): HullConsoleSummaryPart[] {
  const counts = hullConsoleCounts(ship);
  const parts: HullConsoleSummaryPart[] = [
    { count: counts.engineering, label: "ENG", theme: "engineering" },
    { count: counts.science, label: "SCI", theme: "science" },
    { count: counts.tactical, label: "TAC", theme: "tactical" },
    { count: counts.universal, label: "UNI", theme: "universal" },
  ];
  return parts.filter((part) => part.count > 0);
}

/** e.g. `2 x ENG | 3 x SCI | 4 x TAC | 1 x UNI` */
export function formatHullConsoleSummary(ship: HullConsoleShip): string {
  return hullConsoleSummaryParts(ship)
    .map((part) => `${part.count} x ${part.label}`)
    .join(" | ");
}
