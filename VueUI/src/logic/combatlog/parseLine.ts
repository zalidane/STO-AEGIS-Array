import type { CombatLine, PlayerRef } from "./types";

const PLAYER_INTERNAL = /^P\[(\S+)\s+([^\]]+)\]/;

export function parseTimestamp(raw: string): number | null {
  const parts = raw.trim().split(":");
  const yy = parts[0];
  const monthPart = parts[1];
  const dayPart = parts[2];
  const hourPart = parts[3];
  const minutePart = parts[4];
  const secondRaw = parts[5];
  if (
    yy == null ||
    monthPart == null ||
    dayPart == null ||
    hourPart == null ||
    minutePart == null ||
    secondRaw == null
  ) {
    return null;
  }
  const secondParts = secondRaw.split(".");
  const secondPart = secondParts[0];
  if (secondPart == null) return null;
  const year = Number(yy) + 2000;
  const month = Number(monthPart);
  const day = Number(dayPart);
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = Number(secondPart);
  const fraction = secondParts[1] ?? "0";
  const ms = Math.round(Number(`0.${fraction}`) * 1000);
  if (
    ![year, month, day, hour, minute, second, ms].every(Number.isFinite) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return Date.UTC(year, month - 1, day, hour, minute, second, ms);
}

export function parsePlayerInternal(
  internal: string,
  displayName = "",
): PlayerRef | null {
  const match = PLAYER_INTERNAL.exec(internal.trim());
  const idNum = match?.[1];
  const raw = match?.[2];
  if (idNum == null || raw == null) return null;
  const at = raw.lastIndexOf("@");
  const characterName = at >= 0 ? raw.slice(0, at) : raw;
  const handle = at >= 0 ? raw.slice(at + 1) : "";
  return {
    id: `P[${idNum} ${raw}]`,
    characterName,
    handle,
    displayName: displayName.trim() || characterName,
  };
}

export function isHealLine(type: string, magnitude: number, magnitudeBase: number): boolean {
  if (type === "HitPoints" && magnitude < 0) return true;
  return type === "Shield" && magnitude < 0 && magnitudeBase >= 0;
}

export function parseCombatLine(line: string): CombatLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const fields = trimmed.split(",");
  if (fields.length !== 12) return null;
  const headField = fields[0];
  const ownerInternal = fields[1];
  const sourceInternal = fields[3];
  const targetInternal = fields[5];
  const type = fields[8];
  const flags = fields[9];
  const magRaw = fields[10];
  const mag2Raw = fields[11];
  if (
    headField == null ||
    ownerInternal == null ||
    sourceInternal == null ||
    targetInternal == null ||
    type == null ||
    flags == null ||
    magRaw == null ||
    mag2Raw == null
  ) {
    return null;
  }
  const head = headField.split("::");
  const stamp = head[0];
  if (stamp == null || head.length < 2) return null;
  const at = parseTimestamp(stamp);
  if (at == null) return null;
  if (/falling/i.test(flags)) return null;
  const magnitude = Number(magRaw);
  const magnitudeBase = Number(mag2Raw);
  if (!Number.isFinite(magnitude) || !Number.isFinite(magnitudeBase)) return null;
  return {
    at,
    ownerDisplay: head.slice(1).join("::"),
    ownerInternal,
    sourceInternal,
    targetInternal,
    type,
    flags,
    magnitude,
    magnitudeBase,
    heal: isHealLine(type, magnitude, magnitudeBase),
  };
}

export function playerMatchesCaptain(player: PlayerRef, captainName: string): boolean {
  return (
    namesMatch(player.characterName, captainName) ||
    namesMatch(player.displayName, captainName)
  );
}

/** "Jenis Sarmin" matches in-game "Jenis"; exact and either-side extra tokens both count. */
export function namesMatch(left: string, right: string): boolean {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
