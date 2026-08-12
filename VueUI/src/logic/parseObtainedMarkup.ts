import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

export type ObtainedFactionIcon =
  | "federation"
  | "klingon"
  | "romulan"
  | "dominion"
  | "cross"
  | "fed-allies"
  | "kdf-allies";

export type ObtainedToken =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "bullet" }
  | {
      type: "factionIcon";
      faction: ObtainedFactionIcon;
      title?: string;
    }
  | { type: "rarityIcon"; title?: string }
  | { type: "link"; page: string; label: string };

const FILE_FACTION_MAP: Array<[RegExp, ObtainedFactionIcon]> = [
  [/faction\s*federation/i, "federation"],
  [/faction\s*klingon/i, "klingon"],
  [/faction\s*romulan/i, "romulan"],
  [/faction\s*dominion/i, "dominion"],
  [/faction\s*khitomer/i, "cross"],
  [/faction\s*fed-?allies/i, "fed-allies"],
  [/faction\s*kdf-?allies/i, "kdf-allies"],
];

function mapFileToken(
  filename: string,
  title?: string,
): ObtainedToken | null {
  for (const [pattern, faction] of FILE_FACTION_MAP) {
    if (pattern.test(filename)) {
      return { type: "factionIcon", faction, title };
    }
  }

  if (/very\s*rare/i.test(filename) || /prize\s*token/i.test(filename)) {
    return { type: "rarityIcon", title: title ?? "Very rare" };
  }

  return null;
}

/** Remove HTML tags, including attributes with nested quotes. */
export function stripHtmlTags(input: string): string {
  let previous = "";
  let result = input;
  while (result !== previous) {
    previous = result;
    result = result.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  }
  return result;
}

/** Clean visible wiki/HTML leftovers from plain text segments and labels. */
export function cleanObtainedText(input: string): string {
  return stripHtmlTags(input)
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00A0/g, " ")
    // Orphan brackets left by &#91; / &#93; wrappers around wiki links.
    .replace(/\[\s*(?=\[\[)/g, "")
    .replace(/\]\]\s*\]/g, "]]")
    .replace(/(^|[\s(])\[+(?!\[)/g, "$1")
    .replace(/\]+(?=[\s).,]|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lift span title attributes onto nested File: markers so titles survive HTML stripping.
 * Example: <span title="Klingon only">[[File:Faction Klingon.png|...]]</span>
 */
function promoteSpanTitlesOntoFiles(text: string): string {
  return text.replace(
    /<span\b[^>]*\btitle="([^"]+)"[^>]*>\s*(\[\[File:[^\]]+\]\])\s*<\/span>/gi,
    (_match, title: string, fileToken: string) => {
      if (/\|title=/i.test(fileToken)) return fileToken;
      return fileToken.replace(/\]\]$/, `|title=${title}]]`);
    },
  );
}

/**
 * Normalize markup before tokenization:
 * decode entities, flatten HTML inside wiki link labels, drop span wrappers.
 */
function preprocessObtainedMarkup(raw: string): string {
  let text = decodeHtmlEntities(raw);

  // Decode a second time in case labels still contain entities.
  text = decodeHtmlEntities(text);

  text = promoteSpanTitlesOntoFiles(text);

  // Flatten HTML embedded inside wiki link labels: [[Page|<span>Label</span>]]
  text = text.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]*)?\|([^\]]+)\]\]/g,
    (_match, page: string, label: string) => {
      const cleanLabel = cleanObtainedText(label) || page.trim();
      return `[[${page.trim()}|${cleanLabel}]]`;
    },
  );

  // Drop decorative spans/styles but keep their text/wiki children.
  text = text.replace(/<\/?span\b[^>]*>/gi, "");
  text = text.replace(/<\/?u>/gi, "");
  text = text.replace(/<\/?b>/gi, "");
  text = text.replace(/<\/?i>/gi, "");
  text = text.replace(/<\/?font\b[^>]*>/gi, "");

  // Brackets that only wrap a wiki link: [ [[Page]] ]
  text = text.replace(/\[\s*(\[\[)/g, "$1");
  text = text.replace(/(\]\])\s*\]/g, "$1");

  return text;
}

/**
 * Parse STO wiki `obtained` markup into display tokens.
 * Faction/file icons become typed marks; `[[Page]]` / `[[Page|Label]]` become links.
 */
export function parseObtainedMarkup(
  raw: string | null | undefined,
): ObtainedToken[] {
  if (!raw?.trim()) return [];

  const prepared = preprocessObtainedMarkup(raw);
  const lines = prepared.split(/\r?\n/);
  const tokens: ObtainedToken[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex] ?? "";
    if (lineIndex > 0) tokens.push({ type: "break" });

    line = line.replace(/^\s*\*\s*/, () => {
      tokens.push({ type: "bullet" });
      return "";
    });

    const pattern =
      /\[\[File:([^|\]]+)(?:\|([^\]]*))?\]\]|\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]|<[^>]+>/gi;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const between = line.slice(lastIndex, match.index);
      if (between) {
        const text = cleanObtainedText(between);
        if (text) tokens.push({ type: "text", value: text });
      }

      if (match[0].startsWith("[[File:")) {
        const fileOptions = match[2] ?? "";
        const optionTitle = fileOptions.match(/(?:^|\|)title=([^|]+)/i)?.[1];
        const fileToken = mapFileToken(
          match[1] ?? "",
          optionTitle?.trim() || undefined,
        );
        if (fileToken) tokens.push(fileToken);
      } else if (match[0].startsWith("[[")) {
        const page = cleanObtainedText(match[3] ?? "");
        const label = cleanObtainedText(match[4] ?? page) || page;
        if (page) tokens.push({ type: "link", page, label });
      }

      lastIndex = match.index + match[0].length;
    }

    const trailing = cleanObtainedText(line.slice(lastIndex));
    if (trailing) tokens.push({ type: "text", value: trailing });
  }

  return collapseTextTokens(tokens);
}

function collapseTextTokens(tokens: ObtainedToken[]): ObtainedToken[] {
  const output: ObtainedToken[] = [];
  for (const token of tokens) {
    const prev = output[output.length - 1];
    if (token.type === "text" && prev?.type === "text") {
      prev.value = `${prev.value} ${token.value}`.replace(/\s+/g, " ").trim();
      continue;
    }
    output.push(token);
  }
  return output;
}

/** Unique wiki page titles referenced as links. */
export function collectObtainedLinkPages(
  tokens: readonly ObtainedToken[],
): string[] {
  const pages = new Set<string>();
  for (const token of tokens) {
    if (token.type === "link") pages.add(token.page);
  }
  return [...pages];
}
