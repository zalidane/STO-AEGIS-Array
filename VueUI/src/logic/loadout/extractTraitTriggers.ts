import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import {
  resolveTriggerAbilityAlias,
  type TriggerFunctionalCategory,
} from "@/logic/loadout/triggerAliases";

/**
 * Trigger-extraction for traits & starship traits (#31 / epic #29).
 *
 * Turns Cargo `short` / `basic` / `detailed` text into structured triggers that
 * later slices (#32–#33) can cross-reference against the seated loadout.
 * Pure logic — no Vue/store/GraphQL deps. Resolves ability labels via #30.
 */

/** Fixed tray-skill `type` vocabulary (profession / specialization). */
export const TRAIT_TRIGGER_PROFESSIONS = [
  "Tactical",
  "Engineering",
  "Science",
  "Intelligence",
  "Command",
  "Pilot",
  "Temporal Operative",
  "Miracle Worker",
] as const;

export type TraitTriggerProfession =
  (typeof TRAIT_TRIGGER_PROFESSIONS)[number];

export type TraitTriggerKind =
  | "namedAbility"
  | "professionCategory"
  | "functionalCategory"
  | "weaponClass"
  | "combatState";

/** Energy weapon families that traits may require slotted. */
export type TraitTriggerWeaponClass = "beam" | "cannon";

export type NamedAbilityTrigger = {
  kind: "namedAbility";
  /** Catalog TraySkill / captain ability name when resolved. */
  abilityName: string;
  display: string;
};

export type ProfessionCategoryTrigger = {
  kind: "professionCategory";
  /** Professions in first-seen order. */
  professions: readonly TraitTriggerProfession[];
  display: string;
};

export type FunctionalCategoryTrigger = {
  kind: "functionalCategory";
  category: TriggerFunctionalCategory;
  display: string;
};

/**
 * Trait requires at least one slotted weapon of these classes (OR).
 * e.g. Beam Barrage / Broadside Beam Support → beam.
 */
export type WeaponClassTrigger = {
  kind: "weaponClass";
  classes: readonly TraitTriggerWeaponClass[];
  display: string;
};

export type CombatStateTrigger = {
  kind: "combatState";
  display: string;
};

export type ExtractedTraitTrigger =
  | NamedAbilityTrigger
  | ProfessionCategoryTrigger
  | FunctionalCategoryTrigger
  | WeaponClassTrigger
  | CombatStateTrigger;

/** Starship-trait-shaped Cargo fields (personal traits may leave some empty). */
export type TraitTriggerTextSource = {
  name?: string | null;
  short?: string | null;
  basic?: string | null;
  detailed?: string | null;
};

export type WikiLinkRef = {
  page: string;
  label: string;
  /** Index into the source string where the link starts. */
  index: number;
};

const WIKI_LINK_RE =
  /\[\[(?!File:|Image:)([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/gi;

/** Leading trigger display clause: On / When / While / After / Upon / During … */
const LEADING_CLAUSE_RE =
  /^(?:\*+|:+)?\s*((?:On|When|While|After|Upon|During)\b[^:\n]*?)(?:\s*:|\s*$)/im;

/**
 * Split activation phrasing from effect phrasing so buffed abilities after
 * "will grant" are not treated as triggers (e.g. Directed Energy Flux).
 */
const EFFECT_SPLIT_RE =
  /\b(?:will|you gain|grants?|granting|causes?|causing|provides?|providing|increases? your|reduces? the|reduce the)\b/i;

/** Short/detailed lines that describe activation (not effect summaries). */
const ACTIVATION_HINT_RE =
  /\b(?:activat(?:e|ing|ion)|upon\s+activat|when\s+you\s+activat|while\s+(?:slotted|this\s+trait)|^on\b|^when\b|^while\b|^after\b|^upon\b|^during\b)/i;

/** Profession aliases → catalog tray-skill `type` (longest keys first). */
const PROFESSION_ALIAS_ENTRIES: ReadonlyArray<
  readonly [alias: string, profession: TraitTriggerProfession]
> = [
  ["temporal operative", "Temporal Operative"],
  ["miracle worker", "Miracle Worker"],
  ["temp op", "Temporal Operative"],
  ["temporal", "Temporal Operative"],
  ["intelligence", "Intelligence"],
  ["engineering", "Engineering"],
  ["tactical", "Tactical"],
  ["science", "Science"],
  ["command", "Command"],
  ["pilot", "Pilot"],
  ["intel", "Intelligence"],
  ["mw", "Miracle Worker"],
];

const FUNCTIONAL_CATEGORY_LABELS: Readonly<
  Record<TriggerFunctionalCategory, string>
> = {
  anomaly: "Anomaly",
  control: "Control",
  exotic: "Exotic",
  hangarPets: "Hangar pets",
  captainAbility: "Captain ability",
};

/**
 * Functional categories only when the category itself is the activator
 * ("control Bridge Officer ability"), not an effect noun ("exotic damage",
 * "your anomalies").
 */
const FUNCTIONAL_ACTIVATOR_PATTERNS: ReadonlyArray<{
  category: TriggerFunctionalCategory;
  pattern: RegExp;
}> = [
  {
    category: "hangarPets",
    pattern:
      /\b(?:activat(?:e|ing).{0,40}hangar\s+pets?|hangar\s+pets?\b.{0,40}\b(?:abilit|launch|deploy))/i,
  },
  {
    category: "captainAbility",
    pattern:
      /\b(?:activat(?:e|ing).{0,40}captain\s+abilit|captain\s+abilit(?:y|ies)\b)/i,
  },
  {
    category: "control",
    pattern:
      /\bcontrol\s+(?:bridge\s+officer\s+|boff\s+)?abilit(?:y|ies)\b/i,
  },
  {
    category: "anomaly",
    pattern:
      /\b(?:activat(?:e|ing).{0,40}anomal(?:y|ies)|anomal(?:y|ies)\s+(?:bridge\s+officer\s+|boff\s+)?abilit(?:y|ies))\b/i,
  },
  {
    category: "exotic",
    pattern:
      /\b(?:activat(?:e|ing).{0,40}exotic|exotic\s+(?:bridge\s+officer\s+|boff\s+|damage\s+)?abilit(?:y|ies))\b/i,
  },
];

/**
 * Phrases that mean the trait needs a slotted beam and/or cannon weapon.
 * Scanned on full Cargo text (not effect-split) so mid-sentence mentions count.
 */
const WEAPON_CLASS_PATTERNS: ReadonlyArray<{
  weaponClass: TraitTriggerWeaponClass;
  pattern: RegExp;
}> = [
  {
    weaponClass: "beam",
    pattern:
      /\b(?:beam\s+weapons?|firing\s+a\s+beam(?:\s+weapon)?|beam\s+skills?|beam\s+damage|beam\s+or\s+cannon\s+weapon)/i,
  },
  {
    weaponClass: "cannon",
    pattern:
      /\b(?:cannon\s+weapons?|per\s+cannon\s+weapon|cannon\s+weapon\s+activation|beam\s+or\s+cannon\s+weapon)/i,
  },
];

function formatWeaponClassDisplay(
  classes: readonly TraitTriggerWeaponClass[],
): string {
  if (classes.length === 0) return "";
  if (classes.length === 1) {
    return classes[0] === "beam" ? "Beam weapon" : "Cannon weapon";
  }
  return "Beam or cannon weapon";
}

/**
 * Detect beam / cannon weapon requirements from trait Cargo text.
 * Order: beam then cannon when both appear.
 */
export function findWeaponClassRequirements(
  raw: string | null | undefined,
): TraitTriggerWeaponClass[] {
  if (!raw?.trim()) return [];
  const text = cleanMarkupFragment(flattenWikiLabels(raw));
  const found: TraitTriggerWeaponClass[] = [];
  const seen = new Set<TraitTriggerWeaponClass>();
  for (const { weaponClass, pattern } of WEAPON_CLASS_PATTERNS) {
    if (!pattern.test(text)) continue;
    if (seen.has(weaponClass)) continue;
    seen.add(weaponClass);
    found.push(weaponClass);
  }
  return found;
}

function cleanMarkupFragment(value: string): string {
  return decodeHtmlEntities(String(value))
    .replace(/'{2,}/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<hr\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAbilityDecorators(value: string): string {
  return value
    .replace(/^ability:\s*/i, "")
    .replace(/\s*\(\s*ability\s*\)\s*$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenWikiLabels(raw: string): string {
  return decodeHtmlEntities(raw).replace(
    WIKI_LINK_RE,
    (_m, page: string, label?: string) =>
      ` ${stripAbilityDecorators(cleanMarkupFragment(label ?? page))} `,
  );
}

/** Unique wiki page/label pairs from Cargo text (File: tokens skipped). */
export function extractWikiLinkRefs(
  raw: string | null | undefined,
): WikiLinkRef[] {
  if (!raw?.trim()) return [];
  const text = decodeHtmlEntities(raw);
  const refs: WikiLinkRef[] = [];
  WIKI_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_RE.exec(text)) !== null) {
    const pageRaw = cleanMarkupFragment(match[1] ?? "").replace(/_/g, " ");
    const labelRaw = cleanMarkupFragment(match[2] ?? pageRaw).replace(
      /_/g,
      " ",
    );
    const page = pageRaw.trim();
    const label = (labelRaw || page).trim();
    if (!page && !label) continue;
    refs.push({
      page: page || label,
      label: label || page,
      index: match.index,
    });
  }
  return refs;
}

/**
 * Leading `On` / `When` / `While` / `After` … clause for panel display.
 * Prefers `short`, then `detailed`, then `basic`.
 */
export function extractLeadingTriggerClause(
  source: TraitTriggerTextSource,
): string | null {
  for (const field of [source.short, source.detailed, source.basic]) {
    if (!field?.trim()) continue;
    const prepared = cleanMarkupFragment(flattenWikiLabels(field));
    const match = prepared.match(LEADING_CLAUSE_RE);
    const clause = match?.[1]?.trim();
    if (clause) return clause.replace(/\s+/g, " ");
  }
  return null;
}

/**
 * Prefer the activation half of a sentence so effect-side wiki links
 * (buffed abilities, recharge targets) are not extracted as triggers.
 */
export function takeActivationSegment(
  raw: string | null | undefined,
): string {
  if (!raw?.trim()) return "";
  const text = decodeHtmlEntities(raw);
  // First bullet / paragraph only — later bullets are usually effect details.
  const firstBlock = text.split(/\r?\n/)[0] ?? text;
  const split = firstBlock.search(EFFECT_SPLIT_RE);
  if (split <= 0) return firstBlock;
  return firstBlock.slice(0, split);
}

function looksLikeActivationText(raw: string): boolean {
  const flat = cleanMarkupFragment(flattenWikiLabels(raw));
  return ACTIVATION_HINT_RE.test(flat);
}

function matchProfessionAt(
  text: string,
  startIndex: number,
): { profession: TraitTriggerProfession; length: number } | null {
  const slice = text.slice(startIndex);
  const lower = slice.toLowerCase();
  for (const [alias, profession] of PROFESSION_ALIAS_ENTRIES) {
    if (!lower.startsWith(alias)) continue;
    const end = alias.length;
    const beforeOk =
      startIndex === 0 || !/[a-z0-9]/i.test(text.charAt(startIndex - 1));
    const afterOk =
      end >= slice.length || !/[a-z0-9]/i.test(slice.charAt(end));
    if (beforeOk && afterOk) return { profession, length: end };
  }
  return null;
}

/** Scan plain text for tray-skill profession keywords (first-seen order). */
export function findProfessionKeywords(
  raw: string | null | undefined,
): TraitTriggerProfession[] {
  if (!raw?.trim()) return [];
  const text = cleanMarkupFragment(flattenWikiLabels(raw));
  const found: TraitTriggerProfession[] = [];
  const seen = new Set<TraitTriggerProfession>();
  let i = 0;
  while (i < text.length) {
    const hit = matchProfessionAt(text, i);
    if (hit) {
      if (!seen.has(hit.profession)) {
        seen.add(hit.profession);
        found.push(hit.profession);
      }
      i += hit.length;
      continue;
    }
    i += 1;
  }
  return found;
}

function professionFromLink(ref: WikiLinkRef): TraitTriggerProfession | null {
  for (const candidate of [ref.label, ref.page]) {
    const cleaned = stripAbilityDecorators(candidate);
    const direct = findProfessionKeywords(cleaned);
    if (direct.length >= 1) return direct[0] ?? null;
  }
  return null;
}

function findFunctionalCategories(
  raw: string | null | undefined,
): TriggerFunctionalCategory[] {
  if (!raw?.trim()) return [];
  const text = cleanMarkupFragment(flattenWikiLabels(raw));
  const found: TriggerFunctionalCategory[] = [];
  const seen = new Set<TriggerFunctionalCategory>();
  for (const { category, pattern } of FUNCTIONAL_ACTIVATOR_PATTERNS) {
    if (!pattern.test(text)) continue;
    if (seen.has(category)) continue;
    seen.add(category);
    found.push(category);
  }
  return found;
}

function abilityCandidatesFromLink(ref: WikiLinkRef): string[] {
  const out: string[] = [];
  for (const raw of [ref.label, ref.page]) {
    const cleaned = stripAbilityDecorators(raw);
    if (!cleaned) continue;
    out.push(cleaned);
    const withoutBoff = cleaned
      .replace(/\s+bridge\s+officer\s+abilit(?:y|ies)\s*$/i, "")
      .trim();
    if (withoutBoff && withoutBoff !== cleaned) out.push(withoutBoff);
  }
  return out;
}

function formatProfessionDisplay(
  professions: readonly TraitTriggerProfession[],
): string {
  if (professions.length === 0) return "";
  if (professions.length === 1) return professions[0] ?? "";
  if (professions.length === 2) {
    return `${professions[0]} or ${professions[1]}`;
  }
  const head = professions.slice(0, -1).join(", ");
  const last = professions[professions.length - 1];
  return `${head}, or ${last}`;
}

function normalizeLoose(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isBareProfessionLabel(rawLabel: string): boolean {
  const professions = findProfessionKeywords(rawLabel);
  if (professions.length !== 1) return false;
  return normalizeLoose(rawLabel) === normalizeLoose(professions[0] ?? "");
}

type ScanMode = "full" | "namedOnly";

/**
 * Extract ordered, deduplicated triggers from a trait / starship-trait record.
 * Safe on missing or empty fields; deterministic appearance order.
 */
export function extractTraitTriggers(
  source: TraitTriggerTextSource | null | undefined,
): ExtractedTraitTrigger[] {
  if (!source) return [];

  const displayClause = extractLeadingTriggerClause(source);
  const scans: Array<{ text: string; mode: ScanMode }> = [];

  const activationBasic = takeActivationSegment(source.basic);
  if (activationBasic.trim()) {
    scans.push({ text: activationBasic, mode: "full" });
  }

  const activationDetailed = takeActivationSegment(source.detailed);
  if (activationDetailed.trim()) {
    scans.push({
      text: activationDetailed,
      mode: looksLikeActivationText(activationDetailed) ? "full" : "namedOnly",
    });
  }

  const shortText = source.short?.trim() ?? "";
  if (shortText) {
    // Effect-summary shorts ("-Recharge on Science…") must not add professions.
    scans.push({
      text: shortText,
      mode: looksLikeActivationText(shortText) ? "full" : "namedOnly",
    });
  }

  const named: NamedAbilityTrigger[] = [];
  const namedSeen = new Set<string>();
  const professions: TraitTriggerProfession[] = [];
  const professionSeen = new Set<TraitTriggerProfession>();
  const functionals: FunctionalCategoryTrigger[] = [];
  const functionalSeen = new Set<TriggerFunctionalCategory>();
  const weaponClasses: TraitTriggerWeaponClass[] = [];
  const weaponClassSeen = new Set<TraitTriggerWeaponClass>();

  const addNamed = (rawLabel: string) => {
    if (isBareProfessionLabel(rawLabel)) return;
    const resolved = resolveTriggerAbilityAlias(rawLabel);
    if (!resolved) return;
    const key = resolved.toLowerCase();
    if (namedSeen.has(key)) return;
    namedSeen.add(key);
    named.push({
      kind: "namedAbility",
      abilityName: resolved,
      display: resolved,
    });
  };

  const addProfession = (profession: TraitTriggerProfession) => {
    if (professionSeen.has(profession)) return;
    professionSeen.add(profession);
    professions.push(profession);
  };

  const addFunctional = (category: TriggerFunctionalCategory) => {
    if (functionalSeen.has(category)) return;
    functionalSeen.add(category);
    functionals.push({
      kind: "functionalCategory",
      category,
      display: FUNCTIONAL_CATEGORY_LABELS[category],
    });
  };

  const addWeaponClass = (weaponClass: TraitTriggerWeaponClass) => {
    if (weaponClassSeen.has(weaponClass)) return;
    weaponClassSeen.add(weaponClass);
    weaponClasses.push(weaponClass);
  };

  // Weapon-class mentions often sit past effect-split verbs ("will fire…").
  for (const field of [source.basic, source.detailed, source.short]) {
    for (const weaponClass of findWeaponClassRequirements(field)) {
      addWeaponClass(weaponClass);
    }
  }

  for (const { text, mode } of scans) {
    for (const ref of extractWikiLinkRefs(text)) {
      const profession = professionFromLink(ref);
      if (profession) {
        if (mode === "full") addProfession(profession);
        continue;
      }

      if (
        mode === "full" &&
        (/\bcaptain\b/i.test(ref.label) ||
          /\bplayer\s+abilit/i.test(ref.page) ||
          /\bcaptain\s+abilit/i.test(ref.page))
      ) {
        addFunctional("captainAbility");
        continue;
      }

      for (const candidate of abilityCandidatesFromLink(ref)) {
        const before = namedSeen.size;
        addNamed(candidate);
        if (namedSeen.size > before) break;
      }
    }

    if (mode === "full") {
      for (const profession of findProfessionKeywords(text)) {
        addProfession(profession);
      }
      for (const category of findFunctionalCategories(text)) {
        addFunctional(category);
      }
    }

    // Bare ability phrases in "On Emergency Power to Weapons" / "During FAW or …"
    const flat = cleanMarkupFragment(flattenWikiLabels(text));
    const onMatch = flat.match(
      /^(?:On|Upon|After|During)\s+(.+?)(?:\s+Bridge\s+Officer|\s+BOff|\s+abilit|$)/i,
    );
    if (onMatch?.[1]) {
      addNamed(onMatch[1].replace(/:$/, "").trim());
    }
    const duringModes = flat.match(/\bDuring\s+(.+?)(?:\s+to\s+|\s*:|$)/i);
    if (duringModes?.[1]) {
      for (const part of duringModes[1].split(/\s+or\s+/i)) {
        addNamed(part.trim());
      }
    }
  }

  const triggers: ExtractedTraitTrigger[] = [];
  triggers.push(...named);
  if (professions.length > 0) {
    triggers.push({
      kind: "professionCategory",
      professions: [...professions],
      display: formatProfessionDisplay(professions),
    });
  }
  triggers.push(...functionals);
  if (weaponClasses.length > 0) {
    triggers.push({
      kind: "weaponClass",
      classes: [...weaponClasses],
      display: formatWeaponClassDisplay(weaponClasses),
    });
  }

  if (triggers.length === 0 && displayClause) {
    triggers.push({
      kind: "combatState",
      display: displayClause,
    });
  }

  return triggers;
}
