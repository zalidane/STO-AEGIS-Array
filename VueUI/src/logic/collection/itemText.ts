import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import { cleanTraitDescriptionText } from "@/logic/traitBrowser";

export type InfoboxTextBlock = {
  text: string;
  subscript: string | null;
};

export type InfoboxTextFields = {
  text1?: string | null;
  text2?: string | null;
  text3?: string | null;
  text4?: string | null;
  text5?: string | null;
  text6?: string | null;
  text7?: string | null;
  text8?: string | null;
  text9?: string | null;
};

const TEXT_KEYS: Array<keyof InfoboxTextFields> = [
  "text1",
  "text2",
  "text3",
  "text4",
  "text5",
  "text6",
  "text7",
  "text8",
  "text9",
];

function stripExtraneousQuotes(value: string): string {
  return value.replace(/'{2,}/g, "").replace(/["“”]/g, "");
}

/**
 * Turn one Infobox textN field into a preview line.
 * Trailing parenthetical notes become a subscript; wiki italics/quotes are dropped.
 */
export function parseInfoboxTextField(
  raw: string | null | undefined,
): InfoboxTextBlock | null {
  if (!raw?.trim()) return null;

  let value = decodeHtmlEntities(raw);
  value = value.replace(/<br\s*\/?>/gi, "\n");
  value = stripExtraneousQuotes(value);
  const cleaned = cleanTraitDescriptionText(value);
  if (!cleaned) return null;

  const trailing = cleaned.match(/^(.*?)\s*\(([^()\n]+)\)\s*$/s);
  const main = trailing?.[1]?.trim();
  const note = trailing?.[2]?.trim();
  if (main && note) {
    return {
      text: main,
      subscript: `(${note})`,
    };
  }

  return { text: cleaned, subscript: null };
}

export function infoboxTextBlocks(
  fields: InfoboxTextFields,
): InfoboxTextBlock[] {
  return TEXT_KEYS.map((key) => parseInfoboxTextField(fields[key])).filter(
    (block): block is InfoboxTextBlock => block != null,
  );
}
