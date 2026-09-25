import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

/**
 * Curated trigger alias & category map for loadout trait triggers (#30 / epic #29).
 *
 * Cargo text names abilities inconsistently (`Beam: Overload (ability)` vs
 * `Beams: Overload`). Functional categories like "anomaly" are not in Cargo at
 * all. This pure-data module is the maintainable override layer that later
 * slices (#31–#33) resolve against. No Vue/store/GraphQL deps.
 */

/** Ability families that share a common trigger surface in trait text. */
export type TriggerAbilityFamily =
  | "eptx"
  | "firingMode"
  | "attackPattern"
  | "team";

/**
 * Tier-3 conceptual categories that Cargo cannot derive.
 * `hangarPets` is matched by seated hangar fills in #32 (no tray-skill list).
 */
export type TriggerFunctionalCategory =
  | "anomaly"
  | "control"
  | "exotic"
  | "hangarPets"
  | "captainAbility";

/** Catalog tray-skill / captain-ability display names (wiki spelling). */
export type TriggerCatalogAbilityName = string;

/**
 * Emergency Power to X family — catalog names from TraySkill Cargo.
 * Trait text often says EPtW / "Emergency Power to Weapons".
 */
export const EPTX_ABILITIES = [
  "Emergency Power to Weapons",
  "Emergency Power to Shields",
  "Emergency Power to Engines",
  "Emergency Power to Auxiliary",
] as const satisfies readonly TriggerCatalogAbilityName[];

/**
 * Weapon firing-mode upgrades (beams / cannons / torpedoes / energy weapons).
 * Singular wiki forms (`Beam: Overload`) alias onto these plural catalog names.
 */
export const FIRING_MODE_ABILITIES = [
  "Beams: Overload",
  "Beams: Fire at Will",
  "Cannons: Rapid Fire",
  "Cannons: Scatter Volley",
  "Torpedoes: High Yield",
  "Torpedoes: Spread",
  "Torpedo: Transport Warhead",
  "Torpedoes: Nanite Repair Payload",
  "Energy Weapons: Surgical Strikes",
  "Energy Weapons: Exceed Rated Limits",
  "Energy Weapons: Reroute Reserves to Weapons",
] as const satisfies readonly TriggerCatalogAbilityName[];

/** Attack Pattern Alpha is a captain power; Beta–Omega / Lambda are BOff. */
export const ATTACK_PATTERN_ABILITIES = [
  "Attack Pattern Alpha",
  "Attack Pattern Beta",
  "Attack Pattern Delta",
  "Attack Pattern Lambda",
  "Attack Pattern Omega",
] as const satisfies readonly TriggerCatalogAbilityName[];

/** Team abilities across careers / specs. */
export const TEAM_ABILITIES = [
  "Tactical Team",
  "Engineering Team",
  "Science Team",
  "Intelligence Team",
  "Pilot Team",
] as const satisfies readonly TriggerCatalogAbilityName[];

/**
 * Anomaly BOff powers commonly referenced as the "anomaly" trigger class.
 * Truncated with "…" in issue #30 — extend here as Cargo/wiki gaps appear.
 */
export const ANOMALY_ABILITIES = [
  "Gravity Well",
  "Tyken's Rift",
  "Tractor Beam Repulsors",
  "Photonic Shockwave",
  "Chronometric Inversion Field",
  "Organic Nebula",
  "Subspace Vortex",
  "Very Cold In Space",
  "Delayed Overload Cascade",
  "Ionic Turbulence",
  "Timeline Collapse",
  "Destabilizing Resonance Beam",
  "Entropic Cascade",
  "Deploy Gravitic Induction Platform",
] as const satisfies readonly TriggerCatalogAbilityName[];

/**
 * Control BOff powers from Unconventional Systems (space trait):
 * https://stowiki.net/wiki/Unconventional_Systems_(space_trait)
 * Keep this list aligned with that page's "Abilities Affected" table.
 */
export const CONTROL_ABILITIES = [
  // Science
  "Jam Targeting Sensors",
  "Tractor Beam",
  "Scramble Sensors",
  "Tractor Beam Repulsors",
  "Gravity Well",
  "Photonic Shockwave",
  // Engineering
  "Emit Unstable Warp Bubble",
  "Eject Warp Plasma",
  // Intelligence
  "Viral Impulse Burst",
  "Electromagnetic Pulse Probe",
  "Ionic Turbulence",
  // Temporal
  "Heisenberg Amplifier",
  "Chronometric Inversion Field",
  "Timeline Collapse",
  // Pilot
  "Clean Getaway",
  // Miracle Worker
  "Null Pointer Flood",
  "Deploy Gravitic Induction Platform",
] as const satisfies readonly TriggerCatalogAbilityName[];

/** Exotic-damage BOff powers (typically EPG-scaling science / temporal). */
export const EXOTIC_ABILITIES = [
  "Gravity Well",
  "Tyken's Rift",
  "Photonic Shockwave",
  "Charged Particle Burst",
  "Destabilizing Resonance Beam",
  "Chronometric Inversion Field",
  "Timeline Collapse",
  "Entropic Cascade",
  "Very Cold In Space",
  "Organic Nebula",
  "Subspace Vortex",
  "Delayed Overload Cascade",
  "Gravimetric Conversion",
  "Recursive Shearing",
  "Channeled Deconstruction",
  "Rapid Decay",
  "Entropic Redistribution",
  "Aceton Beam",
  "Endothermic Inhibitor Beam",
] as const satisfies readonly TriggerCatalogAbilityName[];

/**
 * Captain career / fleet powers that appear in trait wiki links but are not
 * TraySkill Cargo rows. Used when text says "captain ability" or names one.
 */
export const CAPTAIN_ABILITIES = [
  "Evasive Maneuvers",
  "Brace for Impact",
  "Go Down Fighting",
  "Fire On My Mark",
  "Tactical Initiative",
  "Attack Pattern Alpha",
  "Nadion Inversion",
  "Rotate Shield Frequency",
  "Engineering Proficiency",
  "EPS Power Transfer",
  "Scattering Field",
  "Sensor Scan",
  "Subnucleonic Beam",
  "Photonic Fleet",
  "Threatening Stance",
  "Fleet Support",
  "Tactical Fleet",
  "Engineering Fleet",
  "Science Fleet",
] as const satisfies readonly TriggerCatalogAbilityName[];

/**
 * Hangar/pet triggers are satisfied by seated hangar fills (#32), not by a
 * tray-skill name list. Keep an empty curated list so the category key exists.
 */
export const HANGAR_PET_ABILITIES = [] as const satisfies readonly TriggerCatalogAbilityName[];

/** Family id → catalog ability names. */
export const TRIGGER_ABILITY_FAMILIES: Readonly<
  Record<TriggerAbilityFamily, readonly TriggerCatalogAbilityName[]>
> = {
  eptx: EPTX_ABILITIES,
  firingMode: FIRING_MODE_ABILITIES,
  attackPattern: ATTACK_PATTERN_ABILITIES,
  team: TEAM_ABILITIES,
};

/** Functional category → catalog ability names. */
export const TRIGGER_FUNCTIONAL_CATEGORIES: Readonly<
  Record<TriggerFunctionalCategory, readonly TriggerCatalogAbilityName[]>
> = {
  anomaly: ANOMALY_ABILITIES,
  control: CONTROL_ABILITIES,
  exotic: EXOTIC_ABILITIES,
  hangarPets: HANGAR_PET_ABILITIES,
  captainAbility: CAPTAIN_ABILITIES,
};

/**
 * Explicit text variants → catalog TraySkill / captain ability names.
 * Keys must already be passed through {@link normalizeTriggerAbilityName}.
 * Prefer adding rows here over special-casing in call sites.
 */
const TRIGGER_ABILITY_ALIAS_ENTRIES: ReadonlyArray<
  readonly [alias: string, catalogName: TriggerCatalogAbilityName]
> = [
  // EPtX abbreviations + short forms
  ["eptw", "Emergency Power to Weapons"],
  ["epts", "Emergency Power to Shields"],
  ["epte", "Emergency Power to Engines"],
  ["epta", "Emergency Power to Auxiliary"],
  ["emergency power to weapon", "Emergency Power to Weapons"],

  // Firing-mode singular / shorthand (wiki-link drift)
  ["beam: overload", "Beams: Overload"],
  ["beam overload", "Beams: Overload"],
  ["beams overload", "Beams: Overload"],
  ["bo", "Beams: Overload"],
  ["faw", "Beams: Fire at Will"],
  ["fire at will", "Beams: Fire at Will"],
  ["beams: fire at will", "Beams: Fire at Will"],
  ["beam: fire at will", "Beams: Fire at Will"],
  ["cannon: rapid fire", "Cannons: Rapid Fire"],
  ["cannon rapid fire", "Cannons: Rapid Fire"],
  ["crf", "Cannons: Rapid Fire"],
  ["cannon: scatter volley", "Cannons: Scatter Volley"],
  ["cannon scatter volley", "Cannons: Scatter Volley"],
  ["csv", "Cannons: Scatter Volley"],
  ["torpedo: high yield", "Torpedoes: High Yield"],
  ["torpedo high yield", "Torpedoes: High Yield"],
  ["high yield", "Torpedoes: High Yield"],
  ["torpedo: spread", "Torpedoes: Spread"],
  ["torpedo spread", "Torpedoes: Spread"],
  ["torpedoes spread", "Torpedoes: Spread"],
  // Transport Warhead is singular in TraySkill; accept plural wiki drift
  ["torpedoes: transport warhead", "Torpedo: Transport Warhead"],
  ["transport warhead", "Torpedo: Transport Warhead"],
  ["torpedo: nanite repair payload", "Torpedoes: Nanite Repair Payload"],
  ["nanite repair payload", "Torpedoes: Nanite Repair Payload"],
  ["surgical strikes", "Energy Weapons: Surgical Strikes"],
  ["exceed rated limits", "Energy Weapons: Exceed Rated Limits"],
  ["reroute reserves to weapons", "Energy Weapons: Reroute Reserves to Weapons"],

  // Common wiki short / renamed pages
  ["jam sensors", "Jam Targeting Sensors"],
  ["tykens rift", "Tyken's Rift"],
  ["tyken's rift", "Tyken's Rift"],
];

/** Normalized alias → catalog display name. */
export const TRIGGER_ABILITY_ALIASES: Readonly<
  Record<string, TriggerCatalogAbilityName>
> = Object.fromEntries(TRIGGER_ABILITY_ALIAS_ENTRIES);

const ABILITY_PREFIX = /^ability:\s*/i;
const ABILITY_SUFFIX = /\s*\(\s*ability\s*\)\s*$/i;
/** Trailing roman-numeral ranks in prose ("Beams: Overload I"). */
const TRAILING_RANK = /\s+(?:i{1,3}|iv|v)\s*$/i;
/** Singular Beam:/Cannon:/Torpedo: prefixes → plural catalog forms. */
const SINGULAR_WEAPON_PREFIX =
  /^(beam|cannon|torpedo)(\s*:)/i;

/**
 * Normalize a wiki/Cargo ability label for alias lookup.
 * Handles HTML entities, case, whitespace, `Ability:` prefixes,
 * `(ability)` suffixes, and trailing I–V rank markers.
 */
export function normalizeTriggerAbilityName(
  value: string | null | undefined,
): string {
  if (value == null) return "";
  let text = decodeHtmlEntities(String(value))
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";

  text = text.replace(ABILITY_PREFIX, "").trim();
  text = text.replace(ABILITY_SUFFIX, "").trim();
  text = text.replace(TRAILING_RANK, "").trim();

  return text.toLowerCase();
}

const CANONICAL_BY_NORMALIZED: ReadonlyMap<string, TriggerCatalogAbilityName> =
  (() => {
    const map = new Map<string, TriggerCatalogAbilityName>();
    const add = (name: TriggerCatalogAbilityName) => {
      map.set(normalizeTriggerAbilityName(name), name);
    };
    for (const names of Object.values(TRIGGER_ABILITY_FAMILIES)) {
      for (const name of names) add(name);
    }
    for (const names of Object.values(TRIGGER_FUNCTIONAL_CATEGORIES)) {
      for (const name of names) add(name);
    }
    for (const catalogName of Object.values(TRIGGER_ABILITY_ALIASES)) {
      add(catalogName);
    }
    return map;
  })();

/**
 * Map a free-text ability label onto a curated catalog name when known.
 * Returns `null` for blank or unrecognized labels (callers keep display text).
 */
export function resolveTriggerAbilityAlias(
  value: string | null | undefined,
): TriggerCatalogAbilityName | null {
  const normalized = normalizeTriggerAbilityName(value);
  if (!normalized) return null;

  const aliased = TRIGGER_ABILITY_ALIASES[normalized];
  if (aliased) return aliased;

  const direct = CANONICAL_BY_NORMALIZED.get(normalized);
  if (direct) return direct;

  const pluralized = normalized.replace(
    SINGULAR_WEAPON_PREFIX,
    (_match, weapon: string, colon: string) => `${weapon}s${colon}`,
  );
  if (pluralized !== normalized) {
    const fromPlural = CANONICAL_BY_NORMALIZED.get(pluralized);
    if (fromPlural) return fromPlural;
    const fromPluralAlias = TRIGGER_ABILITY_ALIASES[pluralized];
    if (fromPluralAlias) return fromPluralAlias;
  }

  return null;
}

/** Catalog names for one ability family. */
export function abilitiesForFamily(
  family: TriggerAbilityFamily,
): readonly TriggerCatalogAbilityName[] {
  return TRIGGER_ABILITY_FAMILIES[family];
}

/** Catalog names for one functional category. */
export function abilitiesForFunctionalCategory(
  category: TriggerFunctionalCategory,
): readonly TriggerCatalogAbilityName[] {
  return TRIGGER_FUNCTIONAL_CATEGORIES[category];
}

/** True when `value` resolves to a member of the given family. */
export function isAbilityInFamily(
  value: string | null | undefined,
  family: TriggerAbilityFamily,
): boolean {
  const resolved = resolveTriggerAbilityAlias(value);
  if (!resolved) return false;
  const needle = normalizeTriggerAbilityName(resolved);
  return TRIGGER_ABILITY_FAMILIES[family].some(
    (name) => normalizeTriggerAbilityName(name) === needle,
  );
}

/** True when `value` resolves to a member of the given functional category. */
export function isAbilityInFunctionalCategory(
  value: string | null | undefined,
  category: TriggerFunctionalCategory,
): boolean {
  const resolved = resolveTriggerAbilityAlias(value);
  if (!resolved) return false;
  const needle = normalizeTriggerAbilityName(resolved);
  return TRIGGER_FUNCTIONAL_CATEGORIES[category].some(
    (name) => normalizeTriggerAbilityName(name) === needle,
  );
}
