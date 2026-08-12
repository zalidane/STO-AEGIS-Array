import type { ObtainedToken } from "@/logic/parseObtainedMarkup";
import {
  resolvePrimaryFaction,
  type FactionIdentity,
} from "@/logic/resolvePrimaryFaction";

export type ObtainedFactionMark = {
  letter: string;
  color: string;
  title?: string;
};

export type ObtainedShipLink = {
  page: string;
  label: string;
};

export type ObtainedDisplayBlock =
  | {
      kind: "shipGroup";
      mark: ObtainedFactionMark | null;
      ships: ObtainedShipLink[];
      /** Shared faction key used to merge adjacent groups. */
      factionKey: string;
    }
  | {
      kind: "inline";
      tokens: ObtainedToken[];
    };

export type ObtainedShipLookup = (
  page: string,
) => ({ id: number; name: string } & FactionIdentity) | undefined;

export type ObtainedMarkResolver = (
  ship: ({ id: number; name: string } & FactionIdentity) | undefined,
) => ObtainedFactionMark | null;

function isNoiseToken(token: ObtainedToken): boolean {
  return token.type === "bullet" || token.type === "break";
}

function isAmpersandOrSeparator(token: ObtainedToken): boolean {
  return (
    token.type === "text" && /^[&,\uFF06/]+$/.test(token.value.replace(/\s/g, ""))
  );
}

/** Drop trailing sentence periods from the end of a token line. */
export function stripTrailingPeriods(
  tokens: readonly ObtainedToken[],
): ObtainedToken[] {
  const next = tokens.filter((token) => !isNoiseToken(token));

  while (next.length > 0) {
    const last = next[next.length - 1]!;
    if (last.type === "text") {
      const cleaned = last.value.replace(/\.+$/, "").trim();
      if (!cleaned) {
        next.pop();
        continue;
      }
      if (cleaned !== last.value) {
        next[next.length - 1] = { type: "text", value: cleaned };
      }
    } else if (last.type === "link") {
      const cleaned = last.label.replace(/\.+$/, "").trim();
      if (cleaned !== last.label) {
        next[next.length - 1] = { ...last, label: cleaned };
      }
    }
    break;
  }

  return next.filter((token) => token.type !== "text" || token.value.trim());
}

function lineGroups(allTokens: readonly ObtainedToken[]): ObtainedToken[][] {
  const groups: ObtainedToken[][] = [[]];
  for (const token of allTokens) {
    if (token.type === "break") {
      groups.push([]);
      continue;
    }
    groups[groups.length - 1]!.push(token);
  }
  return groups.filter((line) => line.some((token) => !isNoiseToken(token)));
}

function factionKeyForShip(
  ship: ({ id: number; name: string } & FactionIdentity) | undefined,
): string | null {
  if (!ship) return null;
  const primary = resolvePrimaryFaction(ship);
  return primary ? primary.toLowerCase() : null;
}

function markFromFactionIcon(
  token: Extract<ObtainedToken, { type: "factionIcon" }>,
): ObtainedFactionMark {
  const map: Record<string, ObtainedFactionMark> = {
    federation: { letter: "F", color: "federation", title: token.title },
    klingon: { letter: "K", color: "klingon", title: token.title },
    romulan: { letter: "R", color: "romulan", title: token.title },
    dominion: { letter: "D", color: "dominion", title: token.title },
    cross: { letter: "C", color: "neutral", title: token.title },
    "fed-allies": { letter: "F", color: "federation", title: token.title },
    "kdf-allies": { letter: "K", color: "klingon", title: token.title },
  };
  return map[token.faction] ?? {
    letter: "?",
    color: "neutral",
    title: token.title,
  };
}

function factionKeyFromMark(mark: ObtainedFactionMark | null): string {
  if (!mark) return "";
  return `${mark.letter}:${mark.color}`.toLowerCase();
}

/** Faction-icon + ship links with no prose → treat as a ship source row. */
export function isShipSourceLine(line: readonly ObtainedToken[]): boolean {
  const links = line.filter((token) => token.type === "link");
  if (links.length === 0) return false;

  const hasFactionIcon = line.some((token) => token.type === "factionIcon");
  if (!hasFactionIcon) return false;

  const prose = line.filter(
    (token) =>
      token.type === "text" &&
      token.value.trim() &&
      !isAmpersandOrSeparator(token),
  );
  return prose.length === 0;
}

function resolveLineMark(
  line: readonly ObtainedToken[],
  ships: ObtainedShipLink[],
  lookupShip: ObtainedShipLookup,
  resolveMark: ObtainedMarkResolver,
): ObtainedFactionMark | null {
  for (const ship of ships) {
    const mark = resolveMark(lookupShip(ship.page));
    if (mark) return mark;
  }
  const icon = line.find((token) => token.type === "factionIcon");
  return icon?.type === "factionIcon" ? markFromFactionIcon(icon) : null;
}

function mergeAdjacentShipGroups(
  blocks: ObtainedDisplayBlock[],
): ObtainedDisplayBlock[] {
  const merged: ObtainedDisplayBlock[] = [];

  for (const block of blocks) {
    const prev = merged[merged.length - 1];
    if (
      block.kind === "shipGroup" &&
      prev?.kind === "shipGroup" &&
      block.factionKey &&
      block.factionKey === prev.factionKey
    ) {
      prev.ships.push(...block.ships);
      if (!prev.mark && block.mark) prev.mark = block.mark;
      continue;
    }

    merged.push(
      block.kind === "shipGroup"
        ? { ...block, ships: [...block.ships] }
        : block,
    );
  }

  return merged;
}

/**
 * Turn parsed obtained tokens into display blocks:
 * - same-faction multi-ship lines become one shipGroup (no &)
 * - consecutive same-faction ship rows merge under one icon
 * - non-ship content stays as a single inline flow line
 */
export function layoutObtainedBlocks(
  tokens: readonly ObtainedToken[],
  lookupShip: ObtainedShipLookup,
  resolveMark: ObtainedMarkResolver,
): ObtainedDisplayBlock[] {
  const blocks: ObtainedDisplayBlock[] = [];

  for (const rawLine of lineGroups(tokens)) {
    const line = stripTrailingPeriods(rawLine);
    if (line.length === 0) continue;

    const allLinks = line.filter(
      (token): token is Extract<ObtainedToken, { type: "link" }> =>
        token.type === "link",
    );
    const resolvedShipLinks = allLinks.filter((token) =>
      Boolean(lookupShip(token.page)),
    );
    const treatAsShipSource =
      resolvedShipLinks.length >= 1 || isShipSourceLine(line);

    if (treatAsShipSource && allLinks.length >= 1) {
      const sourceLinks =
        resolvedShipLinks.length > 0 ? resolvedShipLinks : allLinks;
      const ships = sourceLinks.map((link) => ({
        page: link.page,
        label: link.label.replace(/\.+$/, ""),
      }));
      const mark = resolveLineMark(line, ships, lookupShip, resolveMark);
      const factionKey =
        factionKeyForShip(lookupShip(ships[0]!.page)) ??
        factionKeyFromMark(mark);

      blocks.push({
        kind: "shipGroup",
        mark,
        ships,
        factionKey,
      });
      continue;
    }

    const inlineTokens = line.filter((token) => token.type !== "bullet");
    if (inlineTokens.length > 0) {
      blocks.push({ kind: "inline", tokens: inlineTokens });
    }
  }

  return mergeAdjacentShipGroups(blocks);
}
