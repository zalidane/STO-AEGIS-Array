import { mixLabel, participationLine, rankNotes } from "./labels";
import { parseCombatLine, parsePlayerInternal, playerMatchesCaptain } from "./parseLine";
import type {
  CombatFightSummary,
  CombatLine,
  ParseCombatLogInput,
  ParseCombatLogResult,
  PlayerRef,
} from "./types";
import { COMBAT_IDLE_GAP_MS } from "./types";

type PlayerStats = {
  player: PlayerRef;
  damageOut: number;
  damageTaken: number;
  allyHeals: number;
  firstOut: number | null;
  lastOut: number | null;
  firstAt: number | null;
  lastAt: number | null;
};

export function parseCombatLog(
  text: string,
  input: ParseCombatLogInput,
): ParseCombatLogResult {
  const lines: CombatLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = parseCombatLine(raw);
    if (line) lines.push(line);
  }
  if (lines.length === 0) return { ok: false, reason: "empty" };

  const captain = resolveCaptain(lines, input.captainName);
  if (!captain) return { ok: false, reason: "no-captain" };

  const fights: CombatFightSummary[] = [];
  for (const group of splitFights(lines)) {
    const stats = statsForFight(group);
    const mine = stats.get(captain.id);
    if (!mine || !participated(mine)) continue;
    const others = [...stats.values()].filter((row) => row.player.id !== captain.id);
    const mix = mixLabel(mine.damageOut, mine.damageTaken, mine.allyHeals);
    const ranks = rankNotes({
      damageOut: mine.damageOut,
      damageTaken: mine.damageTaken,
      allyHeals: mine.allyHeals,
      others,
    });
    const solo = others.length === 0;
    const durationMs = durationFor(mine);
    fights.push({
      index: fights.length + 1,
      durationMs,
      damageOut: mine.damageOut,
      dps: dpsFor(mine.damageOut, mine),
      damageTaken: mine.damageTaken,
      allyHeals: mine.allyHeals,
      solo,
      otherPlayerCount: others.length,
      mixLabel: mix,
      rankNotes: ranks,
      participation: participationLine({
        solo,
        mixLabel: mix,
        rankNotes: ranks,
        otherPlayerCount: others.length,
      }),
    });
  }

  if (fights.length === 0) return { ok: false, reason: "no-fights" };

  return {
    ok: true,
    parse: {
      uploadedAt: input.uploadedAt,
      fileName: input.fileName,
      captainId: captain.id,
      captainLabel: captainLabel(captain),
      fights,
    },
  };
}

export function isCombatParseSummary(
  value: unknown,
): value is import("./types").CombatParseSummary {
  if (!value || typeof value !== "object") return false;
  const parse = value as import("./types").CombatParseSummary;
  return (
    typeof parse.uploadedAt === "string" &&
    typeof parse.fileName === "string" &&
    typeof parse.captainId === "string" &&
    typeof parse.captainLabel === "string" &&
    Array.isArray(parse.fights) &&
    parse.fights.every(isFightSummary)
  );
}

function isFightSummary(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const fight = value as CombatFightSummary;
  return (
    typeof fight.index === "number" &&
    typeof fight.durationMs === "number" &&
    typeof fight.damageOut === "number" &&
    typeof fight.dps === "number" &&
    typeof fight.damageTaken === "number" &&
    typeof fight.allyHeals === "number" &&
    typeof fight.solo === "boolean" &&
    typeof fight.otherPlayerCount === "number" &&
    typeof fight.mixLabel === "string" &&
    Array.isArray(fight.rankNotes) &&
    fight.rankNotes.every((note) => typeof note === "string") &&
    typeof fight.participation === "string"
  );
}

function splitFights(lines: CombatLine[]): CombatLine[][] {
  const fights: CombatLine[][] = [];
  let current: CombatLine[] = [];
  let lastAt = 0;
  for (const line of lines) {
    if (current.length > 0 && line.at - lastAt >= COMBAT_IDLE_GAP_MS) {
      fights.push(current);
      current = [];
    }
    current.push(line);
    lastAt = line.at;
  }
  if (current.length > 0) fights.push(current);
  return fights;
}

function resolveCaptain(lines: CombatLine[], captainName: string): PlayerRef | null {
  const damage = new Map<string, number>();
  const players = new Map<string, PlayerRef>();
  for (const line of lines) {
    const owner = parsePlayerInternal(line.ownerInternal, line.ownerDisplay);
    if (!owner || !playerMatchesCaptain(owner, captainName)) continue;
    players.set(owner.id, owner);
    if (!line.heal && !isSelfOrEmpty(line.ownerInternal, line.targetInternal)) {
      damage.set(owner.id, (damage.get(owner.id) ?? 0) + Math.abs(line.magnitude));
    }
  }
  if (players.size === 0) return null;
  let best: PlayerRef | null = null;
  let bestDamage = -1;
  for (const player of players.values()) {
    const out = damage.get(player.id) ?? 0;
    if (out > bestDamage) {
      best = player;
      bestDamage = out;
    }
  }
  return best;
}

function statsForFight(lines: CombatLine[]): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();

  function ensure(internal: string, display: string): PlayerStats | null {
    const player = parsePlayerInternal(internal, display);
    if (!player) return null;
    const existing = stats.get(player.id);
    if (existing) return existing;
    const created: PlayerStats = {
      player,
      damageOut: 0,
      damageTaken: 0,
      allyHeals: 0,
      firstOut: null,
      lastOut: null,
      firstAt: null,
      lastAt: null,
    };
    stats.set(player.id, created);
    return created;
  }

  function touch(row: PlayerStats, at: number) {
    row.firstAt = row.firstAt == null ? at : Math.min(row.firstAt, at);
    row.lastAt = row.lastAt == null ? at : Math.max(row.lastAt, at);
  }

  for (const line of lines) {
    const amount = Math.abs(line.magnitude);
    const self = isSelfOrEmpty(line.ownerInternal, line.targetInternal);
    const owner = ensure(line.ownerInternal, line.ownerDisplay);
    const target = parsePlayerInternal(line.targetInternal);

    if (line.heal) {
      if (owner && target && owner.player.id !== target.id) {
        owner.allyHeals += amount;
        touch(owner, line.at);
      }
      continue;
    }

    if (owner && !self) {
      owner.damageOut += amount;
      owner.firstOut = owner.firstOut == null ? line.at : Math.min(owner.firstOut, line.at);
      owner.lastOut = owner.lastOut == null ? line.at : Math.max(owner.lastOut, line.at);
      touch(owner, line.at);
    }

    if (target && line.ownerInternal !== line.targetInternal) {
      const taken = ensure(line.targetInternal, target.displayName);
      if (taken) {
        taken.damageTaken += amount;
        touch(taken, line.at);
      }
    }
  }

  return stats;
}

function isSelfOrEmpty(ownerInternal: string, targetInternal: string): boolean {
  const target = targetInternal.trim();
  return target === "*" || ownerInternal === targetInternal;
}

function participated(row: PlayerStats): boolean {
  return row.damageOut > 0 || row.damageTaken > 0 || row.allyHeals > 0;
}

function durationFor(row: PlayerStats): number {
  if (row.firstOut != null && row.lastOut != null) {
    const span = row.lastOut - row.firstOut;
    return span > 0 ? span : 1000;
  }
  if (row.firstAt != null && row.lastAt != null) {
    const span = row.lastAt - row.firstAt;
    return span > 0 ? span : 1000;
  }
  return 0;
}

function dpsFor(damageOut: number, row: PlayerStats): number {
  if (damageOut <= 0) return 0;
  const span =
    row.firstOut != null && row.lastOut != null ? row.lastOut - row.firstOut : 0;
  const seconds = Math.max(span / 1000, 1);
  return damageOut / seconds;
}

function captainLabel(player: PlayerRef): string {
  return player.handle ? `${player.characterName}@${player.handle}` : player.characterName;
}
