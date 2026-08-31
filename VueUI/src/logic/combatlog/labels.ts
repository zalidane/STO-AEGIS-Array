const MIX_SHARE = 0.15;

type MixRole = {
  id: "dps" | "tank" | "healer";
  label: string;
  secondary: string;
  value: number;
};

export function mixLabel(damageOut: number, damageTaken: number, allyHeals: number): string {
  const all: MixRole[] = [
    { id: "dps", label: "DPS", secondary: "DPS", value: damageOut },
    { id: "tank", label: "Tank", secondary: "tank", value: damageTaken },
    { id: "healer", label: "Healer", secondary: "healer", value: allyHeals },
  ];
  const roles = all.filter((role) => role.value > 0);
  if (roles.length === 0) return "No combat";
  const peak = Math.max(...roles.map((role) => role.value));
  const active = roles
    .filter((role) => role.value >= peak * MIX_SHARE)
    .sort((a, b) => b.value - a.value);
  const primary = active[0];
  const secondary = active[1];
  if (!primary) return "No combat";
  if (!secondary) return primary.label;
  return `${primary.label} with strong ${secondary.secondary}`;
}

export function rankNotes(input: {
  damageOut: number;
  damageTaken: number;
  allyHeals: number;
  others: ReadonlyArray<{
    damageOut: number;
    damageTaken: number;
    allyHeals: number;
  }>;
}): string[] {
  if (input.others.length === 0) return [];
  const notes: string[] = [];
  if (leads(input.damageOut, input.others.map((row) => row.damageOut))) {
    notes.push("most damage dealt");
  }
  if (leads(input.damageTaken, input.others.map((row) => row.damageTaken))) {
    notes.push("most damage taken");
  }
  if (leads(input.allyHeals, input.others.map((row) => row.allyHeals))) {
    notes.push("most ally healing");
  }
  return notes;
}

export function participationLine(input: {
  solo: boolean;
  mixLabel: string;
  rankNotes: readonly string[];
  otherPlayerCount?: number;
}): string {
  if (input.solo) return `Solo parse · ${input.mixLabel}`;
  const others = input.otherPlayerCount ?? 0;
  if (input.rankNotes.length === 0) {
    if (others <= 0) return input.mixLabel;
    const noun = others === 1 ? "captain" : "captains";
    return `${input.mixLabel} · ${others} other ${noun} in this parse`;
  }
  return `${input.mixLabel} · ${input.rankNotes.join(" · ")}`;
}

function leads(value: number, others: readonly number[]): boolean {
  if (value <= 0) return false;
  return others.every((other) => value > other);
}
