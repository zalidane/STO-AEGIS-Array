import { decodeHtmlEntities } from "./decodeHtmlEntities";

export function extractWikiTargets(text: string | null | undefined): string[] {
  if (!text) return [];

  const decoded = decodeHtmlEntities(text);

  const targets: string[] = [];
  const re = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(decoded))) {
    const target = match[1]!.trim();
    if (
      target.startsWith("File:") ||
      target.startsWith("Category:") ||
      target.startsWith(":")
    ) {
      continue;
    }
    targets.push(target);
  }
  return [...new Set(targets)];
}

export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];

  return value
    .split(/[,;]/)
    .map((s) => decodeHtmlEntities(s.trim()))
    .filter(Boolean);
}

export function normalizeShipType(value: string): string {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
