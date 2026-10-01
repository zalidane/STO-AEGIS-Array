/**
 * Wiki Cargo leaves `career` empty on many profession-locked personal traits
 * (lockbox rows especially). Fill those gaps so the builder can hide traits the
 * selected captain cannot equip (#69).
 *
 * Codes match wiki Cargo: tac / eng / sci.
 * Catalog career wins when already set; overrides only fill empties.
 */

export type PersonalTraitCareerCode = "tac" | "eng" | "sci";

/** Lowercase trait name → career code for rows Cargo left blank. */
export const PERSONAL_TRAIT_CAREER_OVERRIDES: Readonly<
  Record<string, PersonalTraitCareerCode>
> = {
  // Space — lock box
  "a good day to die": "tac",
  "coordinated targeting solution": "tac",
  "fleet tactician": "tac",
  "fleet technician": "eng",
  "fleet physicist": "sci",
  "nadion bypass": "eng",
  "photonic reinforcement": "sci",
  "subnucleonic transferal": "sci",
  // Ground — lock box
  "tactical vigilance": "tac",
  "combined assault": "tac",
  "security detail": "tac",
  "orbital devastation": "eng",
  "assault drone fabrication": "eng",
  "distributed shield rerouting": "eng",
  "subspace manipulator": "sci",
  "nanoprobe contagion": "sci",
  "tricorder analysis": "sci",
};

function normalizeKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

/** Map wiki short codes and full career labels onto tac/eng/sci. */
export function normalizeTraitCareerCode(
  value: string | null | undefined,
): PersonalTraitCareerCode | null {
  const code = normalizeKey(value);
  if (!code) return null;
  if (code === "tac" || code === "tactical") return "tac";
  if (code === "eng" || code === "engineering") return "eng";
  if (code === "sci" || code === "science") return "sci";
  return null;
}

/**
 * Prefer a non-empty catalog career; otherwise apply the known override for
 * this trait name. Returns the short wiki code (tac/eng/sci) or null.
 */
export function resolvePersonalTraitCareer(
  name: string | null | undefined,
  career: string | null | undefined,
): PersonalTraitCareerCode | null {
  const fromCatalog = normalizeTraitCareerCode(career);
  if (fromCatalog) return fromCatalog;
  const key = normalizeKey(name);
  if (!key) return null;
  return PERSONAL_TRAIT_CAREER_OVERRIDES[key] ?? null;
}
