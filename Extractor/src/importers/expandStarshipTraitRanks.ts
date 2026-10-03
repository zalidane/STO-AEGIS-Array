/**
 * Expand specialization starship traits that Cargo stores as one family row.
 *
 * The wiki page lists Base / Improved / Superior as separate unlocks inside
 * `obtained` (`<u>Improved Going the Extra Mile</u>`) and folds their numbers
 * into one `detailed` string (`+10/15/20%`). `StarshipTrait.name` is unique, so
 * the catalog and loadout picker can only offer a rank that has its own row.
 *
 * Import turns each underlined Improved / Superior unlock into a row named
 * `Improved {base}` / `Superior {base}`, with that rank's stats and unlock
 * line. The base row keeps the family name and the base numbers. Traits the
 * wiki does not list as Improved or Superior are returned unchanged (#12).
 */

import {
  decodeHtmlEntities,
  decodeHtmlEntitiesOrNull,
} from "../utils/decodeHtmlEntities.js";

export type StarshipTraitCargoRow = Record<string, unknown> & {
  name: string;
};

const RANK_ORDER = ["base", "improved", "superior"] as const;
type RankId = (typeof RANK_ORDER)[number];

const APOSTROPHES = /[\u2018\u2019\u02BC]/g;
const UNIT =
  "(?:%|\\s+(?:sec|seconds|minutes|mins|min|debuffs))";
const VALUE_PART = `[+-]?\\d+(?:\\.\\d+)?${UNIT}?`;

export function expandStarshipTraitRanks<T extends StarshipTraitCargoRow>(
  rows: readonly T[],
): T[] {
  const existingNames = new Set(rows.map((row) => normalizeName(row.name)));
  const expanded: T[] = [];

  for (const row of rows) {
    const ranks = expandFamily(row, existingNames);
    if (!ranks) {
      expanded.push(row);
      continue;
    }
    expanded.push(...ranks);
  }

  return expanded;
}

function expandFamily<T extends StarshipTraitCargoRow>(
  row: T,
  existingNames: Set<string>,
): T[] | null {
  if (typeof row.name !== "string" || !row.name.trim()) return null;
  const baseName = decodeHtmlEntities(row.name).trim();
  const obtained = stringField(row.obtained);
  const family = familyRanks(baseName, obtained);
  if (!family) return null;

  const detailed = stringField(row.detailed);
  const ranks: T[] = [];

  for (const rank of family) {
    const displayName = rankDisplayName(baseName, rank);
    if (rank !== "base" && existingNames.has(normalizeName(displayName))) {
      continue;
    }

    const iconName =
      decodeHtmlEntitiesOrNull(stringField(row["icon name"])) ?? baseName;
    const next = {
      ...row,
      name: rank === "base" ? row.name : displayName,
      detailed: projectDetailed(detailed, baseName, family, rank),
      obtained: projectObtained(obtained, baseName, rank),
      ...(rank === "base" ? {} : { "icon name": iconName }),
    } as T;

    ranks.push(next);
  }

  return ranks;
}

function familyRanks(
  baseName: string,
  obtained: string | null,
): RankId[] | null {
  if (!obtained) return null;
  const present = new Set<RankId>();
  for (const name of underlinedNames(decodeHtmlEntities(obtained))) {
    const rank = exactUnlockRank(name, baseName);
    if (rank === "improved" || rank === "superior") present.add(rank);
  }
  if (present.size === 0) return null;
  return RANK_ORDER.filter((rank) => rank === "base" || present.has(rank));
}

function exactUnlockRank(name: string, baseName: string): RankId | null {
  const normalized = normalizeName(name);
  const base = normalizeName(baseName);
  if (normalized === base) return "base";
  if (normalized === `improved ${base}`) return "improved";
  if (normalized === `superior ${base}`) return "superior";
  return null;
}

function rankDisplayName(baseName: string, rank: RankId): string {
  if (rank === "improved") return `Improved ${baseName}`;
  if (rank === "superior") return `Superior ${baseName}`;
  return baseName;
}

function projectDetailed(
  detailed: string | null,
  baseName: string,
  family: readonly RankId[],
  rank: RankId,
): string | null {
  if (!detailed?.trim()) return detailed;
  const lines = decodeHtmlEntities(detailed)
    .split("\n")
    .map((line) => projectDetailedLine(line, baseName, family, rank))
    .filter((line) => line.trim());
  const text = lines.join("\n").trim();
  return text || null;
}

function projectDetailedLine(
  line: string,
  baseName: string,
  family: readonly RankId[],
  rank: RankId,
): string {
  const withVariant = applyBasicOrOtherVariant(line, rank);
  if (isRankHeader(withVariant, baseName)) return "";

  const grouped = applyRankGroups(withVariant, baseName, family, rank);
  if (grouped != null) return grouped;

  const labeled = applyRankLabel(withVariant, baseName, family, rank);
  if (labeled != null) return labeled;

  return slashSplit(withVariant, family, rank);
}

function projectObtained(
  obtained: string | null,
  baseName: string,
  rank: RankId,
): string | null {
  if (!obtained?.trim()) return obtained;
  const lines = decodeHtmlEntities(obtained).split("\n");
  const kept = lines.filter((line) => lineMatchesRank(line, baseName, rank));
  const text = kept.join("\n").trim();
  return text || null;
}

function lineMatchesRank(
  line: string,
  baseName: string,
  rank: RankId,
): boolean {
  const names = underlinedNames(line);
  if (names.length === 0) return true;
  return names.some((name) => exactUnlockRank(name, baseName) === rank);
}

function underlinedNames(text: string): string[] {
  return [...text.matchAll(/<u>([\s\S]*?)<\/u>/gi)].map((match) =>
    (match[1] ?? "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function isRankHeader(line: string, baseName: string): boolean {
  const plain = splitBullet(line)
    .body.replace(/'{2,}/g, "")
    .replace(/:\s*$/, "")
    .trim();
  const parts = plain.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return false;
  return parts.every((part) => rankForLabelToken(part, baseName) != null);
}

/**
 * `(Normal/Improved: max 10 stacks)(Superior: up to +30% max)`.
 * Returns null when the line is not a rank-group line.
 */
function applyRankGroups(
  line: string,
  baseName: string,
  family: readonly RankId[],
  rank: RankId,
): string | null {
  const groups: { start: number; end: number; ranks: RankId[]; body: string }[] =
    [];
  const pattern = /\(([^()]+?)\s*:\s*([^()]*)\)/g;
  for (const match of line.matchAll(pattern)) {
    const ranks = ranksForLabel(match[1] ?? "", baseName, family);
    if (!ranks) return null;
    groups.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      ranks,
      body: (match[2] ?? "").trim(),
    });
  }
  if (groups.length === 0) return null;

  const first = groups[0]!;
  const last = groups[groups.length - 1]!;
  const prefix = line.slice(0, first.start);
  const suffix = line.slice(last.end);
  const chosen = groups.find((group) => group.ranks.includes(rank));
  if (!chosen) {
    const shared = suffix.replace(/^\s*[.)]\s*/, "").trim();
    return shared ? joinBullet(prefix, shared) : "";
  }

  const body = slashSplit(chosen.body, chosen.ranks, rank);
  return joinBullet(prefix, `${body}${suffix}`.trim());
}

/**
 * A leading `''Rank'':` / `''Improved/Superior'':` bullet belongs only to
 * those ranks. Returns null when the line is not labeled that way.
 */
function applyRankLabel(
  line: string,
  baseName: string,
  family: readonly RankId[],
  rank: RankId,
): string | null {
  const { bullet, body } = splitBullet(line);
  const match =
    /^'''([\s\S]*?)'''(?:\s+variant)?\s*:?\s*([\s\S]*)$/.exec(body) ??
    /^''([\s\S]*?)''(?:\s+variant)?\s*:?\s*([\s\S]*)$/.exec(body);
  if (!match) return null;

  const ranks = ranksForLabel(match[1] ?? "", baseName, family);
  if (!ranks) return null;
  if (!ranks.includes(rank)) return "";

  const rest = slashSplit(match[2] ?? "", ranks, rank);
  return joinBullet(bullet, rest);
}

/** `5 (''basic'' variant) or 10 minutes (other variants)`. */
function applyBasicOrOtherVariant(line: string, rank: RankId): string {
  return line.replace(
    /(\d+(?:\.\d+)?)\s*\(\s*''basic''\s*variant\s*\)\s*or\s*(\d+(?:\.\d+)?)(?:\s+([A-Za-z]+))?\s*\(\s*other variants\s*\)/gi,
    (_match, basicNum: string, otherNum: string, unit?: string) => {
      const num = rank === "base" ? basicNum : otherNum;
      return unit ? `${num} ${unit}` : num;
    },
  );
}

function slashSplit(
  text: string,
  ranks: readonly RankId[],
  rank: RankId,
): string {
  const index = ranks.indexOf(rank);
  const count = ranks.length;
  if (index < 0 || count < 2 || !text) return text;

  const pattern = new RegExp(
    `(?<![\\w.%/])(${VALUE_PART}(?:\\s*\\/\\s*${VALUE_PART}){${count - 1}})(?!\\s*\\/)`,
    "gi",
  );
  return text.replace(pattern, (match) => pickSlashPart(match, index));
}

function pickSlashPart(match: string, index: number): string {
  const parts = match.split(/\s*\/\s*/).map(parseValueToken);
  if (parts.some((part) => part == null)) return match;
  const tokens = parts as ValueToken[];
  const chosen = tokens[index];
  if (!chosen) return match;

  const onlyFirstSigned =
    Boolean(tokens[0]?.sign) && tokens.slice(1).every((part) => !part.sign);
  const sign = chosen.sign || (onlyFirstSigned ? (tokens[0]?.sign ?? "") : "");
  const units = [
    ...new Set(tokens.map((part) => part.unit).filter((unit) => unit)),
  ];
  const unit = chosen.unit || (units.length === 1 ? units[0]! : "");
  return `${sign}${chosen.number}${unit}`;
}

type ValueToken = { sign: string; number: string; unit: string };

function parseValueToken(raw: string): ValueToken | null {
  const match =
    /^([+-]?)(\d+(?:\.\d+)?)(%|\s+(?:sec|seconds|minutes|mins|min|debuffs))?$/i.exec(
      raw.trim(),
    );
  if (!match) return null;
  return {
    sign: match[1] ?? "",
    number: match[2] ?? "",
    unit: match[3] ?? "",
  };
}

function ranksForLabel(
  label: string,
  baseName: string,
  family: readonly RankId[],
): RankId[] | null {
  const parts = label
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const mapped: RankId[] = [];
  for (const part of parts) {
    const rank = rankForLabelToken(part, baseName);
    if (!rank || !family.includes(rank)) return null;
    if (!mapped.includes(rank)) mapped.push(rank);
  }
  return mapped;
}

function rankForLabelToken(token: string, baseName: string): RankId | null {
  const exact = exactUnlockRank(token, baseName);
  if (exact) return exact;

  const normalized = normalizeName(token);
  const base = normalizeName(baseName);
  if (normalized === "basic" || normalized === "normal") return "base";
  if (normalized === "improved") return "improved";
  if (normalized === "superior") return "superior";
  if (
    normalized.startsWith("improved ") &&
    abbreviates(normalized.slice("improved ".length), base)
  ) {
    return "improved";
  }
  if (
    normalized.startsWith("superior ") &&
    abbreviates(normalized.slice("superior ".length), base)
  ) {
    return "superior";
  }
  if (abbreviates(normalized, base)) return "base";
  return null;
}

function abbreviates(token: string, base: string): boolean {
  const tokenWords = token.split(/[\s.]+/).filter(Boolean);
  const baseWords = base.split(/\s+/).filter(Boolean);
  if (tokenWords.length === 0 || baseWords.length === 0) return false;

  if (tokenWords.length === baseWords.length) {
    return tokenWords.every((word, index) => {
      const full = baseWords[index] ?? "";
      if (word === full) return true;
      return word.length >= 3 && full.startsWith(word);
    });
  }

  const initials = baseWords.map((word) => word[0] ?? "").join("");
  const compact = token.replace(/[.\s]/g, "");
  return compact === initials && initials.length >= 2;
}

function splitBullet(line: string): { bullet: string; body: string } {
  const match = /^(\s*[*#:]+[\s*]*)/.exec(line);
  const bullet = match?.[1] ?? "";
  return { bullet, body: line.slice(bullet.length) };
}

function joinBullet(bullet: string, rest: string): string {
  const body = rest.trim();
  if (!body) return "";
  if (!bullet) return body;
  if (/\s$/.test(bullet)) return `${bullet}${body}`;
  return `${bullet} ${body}`;
}

function stringField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function normalizeName(value: string): string {
  return decodeHtmlEntities(value)
    .replace(APOSTROPHES, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
