import { WIKI_IMAGE_KINDS } from "./imageObjects.js";

const KINDS = new Set<string>(WIKI_IMAGE_KINDS);
const DOWNLOAD_NAME = /^([a-z-]+)__(.+)$/;
/** Chrome renames duplicates "x.png" → "x (1).png". */
const DUPLICATE_SUFFIX = /^(.*) \((\d+)\)(\.[^.]+)$/;
const REPORT_NAME = /^browser-download-report(?: \((\d+)\))?\.json$/;

export type DownloadMove = { source: string; kind: string; filename: string };

/**
 * Decide which downloaded files go where. `existing` holds `<kind>/<file>`
 * keys already in VueUI/public/images; those are not overwritten. For
 * duplicates, the un-suffixed name wins; a `(n)` copy is used only when no
 * plain copy was downloaded.
 */
export function planDownloadMoves(
  names: readonly string[],
  existing: ReadonlySet<string> = new Set(),
): { moves: DownloadMove[]; alreadyPresent: string[]; report: string | null } {
  const byKey = new Map<string, DownloadMove & { rank: number }>();
  let report: { name: string; rank: number } | null = null;
  for (const name of names) {
    const reportMatch = REPORT_NAME.exec(name);
    if (reportMatch) {
      const rank = reportMatch[1] ? Number(reportMatch[1]) : 0;
      if (!report || rank > report.rank) report = { name, rank };
      continue;
    }
    const match = DOWNLOAD_NAME.exec(name);
    if (!match || !KINDS.has(match[1]!)) continue;
    let filename = match[2]!;
    let rank = 0;
    const dup = DUPLICATE_SUFFIX.exec(filename);
    if (dup) {
      filename = `${dup[1]}${dup[3]}`;
      rank = Number(dup[2]);
    }
    const key = `${match[1]}/${filename}`;
    const prior = byKey.get(key);
    if (!prior || rank < prior.rank) {
      byKey.set(key, { source: name, kind: match[1]!, filename, rank });
    }
  }
  const moves: DownloadMove[] = [];
  const alreadyPresent: string[] = [];
  for (const [key, move] of [...byKey.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (existing.has(key)) alreadyPresent.push(key);
    else moves.push({ source: move.source, kind: move.kind, filename: move.filename });
  }
  return { moves, alreadyPresent, report: report?.name ?? null };
}
