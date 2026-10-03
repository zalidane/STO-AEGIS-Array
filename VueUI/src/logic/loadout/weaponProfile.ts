/**
 * Weapon class and damage-type facts used by trait trigger checks.
 * Pure text classification — no Vue, catalog, or seating deps.
 */

import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

/** Beam and cannon stay available for single-class traits. Energy and torpedo are separate. */
export type WeaponProfileClass = "beam" | "cannon" | "energy" | "torpedo";

const ENERGY_DAMAGE_TOKENS = [
  "antiproton",
  "disruptor",
  "phaser",
  "plasma",
  "polaron",
  "proton",
  "tetryon",
] as const;

/**
 * Longer tokens first so "antiproton" is not recorded as "proton".
 * Cold and Fire stay last; they are real damage types but short words.
 */
const DAMAGE_TYPE_TOKENS: ReadonlyArray<{ token: string; label: string }> = [
  { token: "antiproton", label: "Antiproton" },
  { token: "electrical", label: "Electrical" },
  { token: "disruptor", label: "Disruptor" },
  { token: "radiation", label: "Radiation" },
  { token: "tetryon", label: "Tetryon" },
  { token: "physical", label: "Physical" },
  { token: "polaron", label: "Polaron" },
  { token: "psionic", label: "Psionic" },
  { token: "kinetic", label: "Kinetic" },
  { token: "plasma", label: "Plasma" },
  { token: "phaser", label: "Phaser" },
  { token: "proton", label: "Proton" },
  { token: "cold", label: "Cold" },
  { token: "fire", label: "Fire" },
];

const TYPE_WORD =
  "antiproton|disruptor|electrical|phaser|physical|plasma|polaron|proton|psionic|radiation|tetryon|kinetic|cold|fire";
const TYPE_LIST = `(?:${TYPE_WORD})(?:\\s*,\\s*|\\s+or\\s+|\\s+and\\s+)+(?:${TYPE_WORD})(?:(?:\\s*,\\s*|\\s+or\\s+|\\s+and\\s+)(?:${TYPE_WORD}))*`;

export type WeaponText = {
  name?: string | null;
  searchText?: string | null;
};

function plain(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

function damageTypesIn(text: string): string[] {
  if (!text.trim()) return [];
  const hits: { index: number; label: string }[] = [];
  for (const { token, label } of DAMAGE_TYPE_TOKENS) {
    const pattern = new RegExp(`\\b${token}\\b`, "gi");
    for (const match of text.matchAll(pattern)) {
      hits.push({ index: match.index ?? 0, label });
    }
  }
  hits.sort((left, right) => left.index - right.index);
  const found: string[] = [];
  for (const hit of hits) {
    if (!found.includes(hit.label)) found.push(hit.label);
  }
  return found;
}

/** Damage types named on a seated weapon (catalog name, then "X Damage" body copy). */
export function damageTypesFromWeapon(weapon: WeaponText): string[] {
  const name = plain(weapon.name);
  const body = plain(weapon.searchText);
  const fromName = damageTypesIn(name);
  const fromBody = damageTypesIn(
    [...body.matchAll(new RegExp(`\\b(${TYPE_WORD})\\s+damage\\b`, "gi"))]
      .map((match) => match[1] ?? "")
      .join(" "),
  );
  const found = [...fromName];
  for (const label of fromBody) {
    if (!found.includes(label)) found.push(label);
  }
  return found;
}

function isTorpedoName(name: string): boolean {
  return /\btorpedos?\b/i.test(name);
}

function isDirectedEnergyName(name: string): boolean {
  if (/\bbeams?\b/i.test(name)) return true;
  if (/\b(?:cannons?|turrets?)\b/i.test(name)) return true;
  return ENERGY_DAMAGE_TOKENS.some((token) =>
    new RegExp(`\\b${token}\\b`, "i").test(name),
  );
}

/**
 * Beam / cannon stay distinct (OR traits such as Beam Barrage).
 * Energy is any directed-energy weapon, including beams and cannons.
 * A torpedo is not energy, even when its name includes an energy flavor
 * ("Plasma Torpedo").
 */
export function weaponClassesFromItemName(
  name: string | null | undefined,
): WeaponProfileClass[] {
  return weaponClassesFromWeapon({ name });
}

export function weaponClassesFromWeapon(
  weapon: WeaponText,
): WeaponProfileClass[] {
  const name = plain(weapon.name);
  if (!name) return [];
  const classes: WeaponProfileClass[] = [];
  if (/\bbeams?\b/i.test(name)) classes.push("beam");
  if (/\b(?:cannons?|turrets?)\b/i.test(name)) classes.push("cannon");
  if (isTorpedoName(name)) {
    classes.push("torpedo");
    return classes;
  }
  const bodyEnergy = ENERGY_DAMAGE_TOKENS.some((token) =>
    new RegExp(`\\b${token}\\s+damage\\b`, "i").test(plain(weapon.searchText)),
  );
  if (isDirectedEnergyName(name) || bodyEnergy) classes.push("energy");
  return classes;
}

/**
 * Damage types that fulfill a "when dealing damage with …" trait.
 * The parenthetical / comma list is the trigger. A bonus recipient named
 * in the same text counts too ("Bonus Damage to the Five Magicks and
 * Disruptor"), so the hover can name the weapon that trait is written for.
 */
export function damageTypesRequiredByTrait(
  text: string | null | undefined,
): string[] | null {
  const flat = plain(text);
  if (!flat) return null;

  const found: string[] = [];
  const add = (chunk: string) => {
    for (const label of damageTypesIn(chunk)) {
      if (!found.includes(label)) found.push(label);
    }
  };

  const paren =
    /dealing\s+damage\s+with\b[^()\n]{0,80}\(([^)]+)\)/i.exec(flat) ??
    /five\s+magicks\s*\(([^)]+)\)/i.exec(flat);
  if (paren?.[1]) add(paren[1]);

  const dealingList = new RegExp(`\\bdealing\\s+(${TYPE_LIST})`, "i").exec(flat);
  if (dealingList?.[1]) add(dealingList[1]);

  if (found.length === 0) return null;

  const bonusTo = /bonus\s+damage\s+to\s+([^(\n.]+)/i.exec(flat);
  if (bonusTo?.[1]) add(bonusTo[1]);
  const bonusList = new RegExp(
    `\\bbonus\\s+(${TYPE_LIST})\\s+damage\\b`,
    "i",
  ).exec(flat);
  if (bonusList?.[1]) add(bonusList[1]);

  return found;
}

export function formatDamageTypeList(types: readonly string[]): string {
  if (types.length === 0) return "";
  if (types.length === 1) return types[0] ?? "";
  if (types.length === 2) return `${types[0]} or ${types[1]}`;
  return `${types.slice(0, -1).join(", ")}, or ${types[types.length - 1]}`;
}

/**
 * Super Charged Weapons: a torpedo firing buffs directed energy weapons.
 * Both have to be slotted. Firing-mode traits that merely mention both
 * words do not match.
 */
export function requiresEnergyWeaponAndTorpedo(
  text: string | null | undefined,
): boolean {
  const flat = plain(text);
  if (!flat) return false;
  if (
    /\benergy\s+weapons?\b[^.]{0,48}\benhanced\s+by\s+torpedos?\b/i.test(flat)
  ) {
    return true;
  }
  const firesTorpedo = /\bfiring\s+(?:a\s+)?torpedos?\b/i.test(flat);
  if (!firesTorpedo) return false;
  return /\b(?:boost|buff|enhanc\w*|grant)\w*\b[^.]{0,140}\b(?:directed\s+)?energy\s+weapons?\b/i.test(
    flat,
  );
}
