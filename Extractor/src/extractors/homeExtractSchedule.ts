import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { tableSchemas } from "./schemas/schemaList.js";

/** Approximate calendar month used by the home monthly check. */
export const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const LAST_EXTRACT_FILENAME = "last-extract.json";

export type LastExtractState = {
  /** ISO-8601 timestamp of the last successful local extract. */
  lastExtractAt: string;
  /** Which entry point recorded the stamp. */
  source?: string;
};

export type ExtractDueDecision = {
  due: boolean;
  lastExtractAt: Date | null;
  ageMs: number | null;
  reason: string;
};

/**
 * Pure gate for the home monthly extract check.
 * Due when never run, or when more than `maxAgeMs` has passed.
 */
export function isExtractDue(
  lastExtractAt: Date | null,
  now: Date = new Date(),
  maxAgeMs: number = ONE_MONTH_MS,
): ExtractDueDecision {
  if (lastExtractAt == null || Number.isNaN(lastExtractAt.getTime())) {
    return {
      due: true,
      lastExtractAt: null,
      ageMs: null,
      reason: "no prior extract timestamp",
    };
  }

  const ageMs = now.getTime() - lastExtractAt.getTime();
  if (ageMs > maxAgeMs) {
    return {
      due: true,
      lastExtractAt,
      ageMs,
      reason: `last extract was ${formatAge(ageMs)} ago (> ${formatAge(maxAgeMs)})`,
    };
  }

  return {
    due: false,
    lastExtractAt,
    ageMs,
    reason: `last extract was ${formatAge(ageMs)} ago (threshold ${formatAge(maxAgeMs)})`,
  };
}

export function parseLastExtractState(raw: unknown): LastExtractState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const lastExtractAt = (raw as { lastExtractAt?: unknown }).lastExtractAt;
  if (typeof lastExtractAt !== "string" || !lastExtractAt.trim()) return null;
  const parsed = new Date(lastExtractAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const source = (raw as { source?: unknown }).source;
  const state: LastExtractState = {
    lastExtractAt: parsed.toISOString(),
  };
  if (typeof source === "string") state.source = source;
  return state;
}

export function lastExtractPath(outputDir: string): string {
  return join(outputDir, LAST_EXTRACT_FILENAME);
}

export async function readLastExtractState(
  outputDir: string,
): Promise<LastExtractState | null> {
  const path = lastExtractPath(outputDir);
  if (!existsSync(path)) return null;
  try {
    const raw: unknown = JSON.parse(await readFile(path, "utf8"));
    return parseLastExtractState(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve last-extract time: prefer gitignored last-extract.json,
 * else newest mtime among Cargo table JSON files (and ShipExperimentalWeapons).
 */
export async function resolveLastExtractAt(
  outputDir: string,
): Promise<Date | null> {
  const state = await readLastExtractState(outputDir);
  if (state) return new Date(state.lastExtractAt);

  return newestCargoOutputMtime(outputDir);
}

export async function newestCargoOutputMtime(
  outputDir: string,
): Promise<Date | null> {
  const names = [
    ...tableSchemas.map((table) => `${table}.json`),
    "ShipExperimentalWeapons.json",
  ];

  let newest: Date | null = null;
  for (const name of names) {
    const path = join(outputDir, name);
    if (!existsSync(path)) continue;
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size === 0) continue;
      const mtime = info.mtime;
      if (!newest || mtime.getTime() > newest.getTime()) {
        newest = mtime;
      }
    } catch {
      // ignore unreadable files
    }
  }
  return newest;
}

export async function writeLastExtractState(
  outputDir: string,
  at: Date = new Date(),
  source = "extract",
): Promise<LastExtractState> {
  await mkdir(outputDir, { recursive: true });
  const state: LastExtractState = {
    lastExtractAt: at.toISOString(),
    source,
  };
  await writeFile(
    lastExtractPath(outputDir),
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
  return state;
}

export function formatAge(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${minutes}m`;
}

export function homeExtractReminder(): string {
  return [
    "Next steps (home machine only):",
    "  1. Review git diff under Extractor/output/ and VueUI/public/images/",
    "  2. Commit updated JSON (and any new images you want in git)",
    "  3. Push, then run: npm run import:prod",
    "Production/Railway must never hit stowiki.net — only import committed JSON.",
  ].join("\n");
}
