import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import { itemSlotClassesFromType } from "./slotClass";

/** Hull fields used to match wiki hangar-pet `who` restrictions. */
export type HangarShip = {
  name: string;
  wikiName?: string | null;
  type?: string | null;
  displayType?: string | null;
  displayClass?: string | null;
  shipTypeName?: string | null;
  tier?: number | null;
};

const TIER_MARK = /\s*[\(\[]\s*t(?:5-u|5u|5|6)\s*[\)\]]/gi;

const HULL_WORDS = new Set([
  "any",
  "assault",
  "battle",
  "battlecruiser",
  "battlecruisers",
  "carrier",
  "carriers",
  "command",
  "cruiser",
  "cruisers",
  "deck",
  "destroyer",
  "destroyers",
  "dreadnought",
  "dreadnoughts",
  "engineering",
  "escort",
  "escorts",
  "explorer",
  "fleet",
  "flight",
  "frigate",
  "frigates",
  "full",
  "heavy",
  "intel",
  "miracle",
  "operations",
  "or",
  "raptor",
  "raptors",
  "reconnaissance",
  "science",
  "strategic",
  "support",
  "surveillance",
  "tactical",
  "the",
  "vessel",
  "vessels",
  "warbird",
  "warbirds",
  "worker",
]);

function fold(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/['\u2018\u2019\u02BC]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripTier(token: string): { text: string; tier: number | null } {
  const folded = fold(token);
  const marked = folded.replace(/[\[\]()]/g, " ");
  let tier: number | null = null;
  if (/\bt6\b/.test(marked)) tier = 6;
  else if (/\bt5-u\b|\bt5u\b/.test(marked)) tier = 5;
  const text = folded.replace(TIER_MARK, " ").replace(/\s+/g, " ").trim();
  return { text, tier };
}

/** Split wiki `who` on commas and `or`. */
export function parseHangarWhoTokens(who: string): string[] {
  return decodeHtmlEntities(who)
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s*,\s*|\s+or\s+/i)
    .map((part) => part.replace(/^or\s+/i, "").trim())
    .filter(Boolean);
}

export function isFullCarrierType(type: string | null | undefined): boolean {
  const value = fold(type ?? "");
  if (!value.includes("carrier")) return false;
  return !value.includes("flight deck");
}

function tokenWords(text: string): string[] {
  return text
    .replace(/^any\s+/, "")
    .replace(/^fleet\s+/, "")
    .split(" ")
    .filter((word) => word.length > 1 && word !== "the");
}

function isHullOnly(text: string): boolean {
  const words = tokenWords(text);
  return words.length > 0 && words.every((word) => HULL_WORDS.has(word));
}

function leadingFamily(text: string): string {
  const words = tokenWords(text);
  const hullAt = words.findIndex((word) => HULL_WORDS.has(word));
  if (hullAt <= 0) return "";
  return words.slice(0, hullAt).join(" ");
}

function shipHaystack(ship: HangarShip): string {
  return fold(
    [
      ship.name,
      ship.wikiName,
      ship.type,
      ship.displayType,
      ship.displayClass,
      ship.shipTypeName,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function tierAllows(required: number | null, ship: HangarShip): boolean {
  if (required == null || ship.tier == null) return true;
  return ship.tier === required;
}

function wordInHaystack(word: string, haystack: string): boolean {
  if (haystack.includes(word)) return true;
  if (word.endsWith("s") && haystack.includes(word.slice(0, -1))) return true;
  return haystack.includes(`${word}s`);
}

function wordsInHaystack(words: readonly string[], haystack: string): boolean {
  return words.every((word) => wordInHaystack(word, haystack));
}

function hullType(ship: HangarShip): string | null {
  return ship.type ?? ship.displayType ?? null;
}

function tokenAllowsShip(
  text: string,
  tier: number | null,
  familyHint: string,
  ship: HangarShip,
): boolean {
  if (!tierAllows(tier, ship)) return false;
  const haystack = shipHaystack(ship);
  const words = tokenWords(text);
  if (words.length === 0) return false;

  const joined = words.join(" ");
  if (joined === "full carrier") {
    return isFullCarrierType(hullType(ship));
  }

  if (words[words.length - 1] === "starship") {
    return wordsInHaystack(words.slice(0, -1), haystack);
  }

  if (isHullOnly(text)) {
    if (joined === "carrier" || joined === "fleet carrier") {
      const needsFleet = joined === "fleet carrier";
      return (
        (!needsFleet || haystack.includes("fleet")) &&
        isFullCarrierType(hullType(ship))
      );
    }
    const familyWords = familyHint.split(" ").filter(Boolean);
    if (familyWords.length === 1) {
      return (
        wordsInHaystack(familyWords, haystack) &&
        wordsInHaystack(words, haystack)
      );
    }
    return wordsInHaystack(words, haystack);
  }

  return wordsInHaystack(words, haystack);
}

export function hangarShipFromCatalog(
  ship:
    | {
        name: string;
        wikiName?: string | null;
        type?: string | null;
        displayType?: string | null;
        displayClass?: string | null;
        shipType?: { name?: string | null } | null;
        tier?: number | null;
      }
    | null
    | undefined,
): HangarShip | null {
  if (!ship) return null;
  return {
    name: ship.name,
    wikiName: ship.wikiName,
    type: ship.type,
    displayType: ship.displayType,
    displayClass: ship.displayClass,
    shipTypeName: ship.shipType?.name ?? null,
    tier: ship.tier ?? null,
  };
}

/**
 * Empty `who` means any hangar ship. Restricted pets match if any wiki
 * clause fits this hull’s name, type, or family (Any Full Carrier, etc.).
 * Unique-console `who` is ignored — hangar items only.
 */
export function hangarPetFitsShip(
  item: { type?: string | null; who?: string | null },
  ship: HangarShip | null | undefined,
): boolean {
  if (!itemSlotClassesFromType(item.type).includes("hangar")) return true;
  const who = item.who?.trim();
  if (!who) return true;
  if (!ship) return false;

  const tokens = parseHangarWhoTokens(who);
  if (tokens.length === 0) return true;

  let familyHint = "";
  for (const raw of tokens) {
    const { text, tier } = stripTier(raw);
    const family = leadingFamily(text);
    if (family) familyHint = family;
    if (tokenAllowsShip(text, tier, familyHint, ship)) return true;
  }
  return false;
}
