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

const DETAIL_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type InfoboxDetailFields = InfoboxTextFields & {
  [Key in
    | `head${(typeof DETAIL_INDEXES)[number]}`
    | `subhead${(typeof DETAIL_INDEXES)[number]}`]?: string | null;
};

export type ItemDetailSection = {
  title: string;
  blocks: InfoboxTextBlock[];
};

/**
 * Group cargo head/subhead/text rows the way the trait card groups a labeled
 * section and its body. Named heads become section titles; unnamed stats share
 * one Description section.
 */
export function buildItemDetailSections(
  fields: InfoboxDetailFields,
): ItemDetailSection[] {
  const rows = DETAIL_INDEXES.flatMap((index) => {
    const head = cleanTraitDescriptionText(fields[`head${index}`]);
    const subhead = cleanTraitDescriptionText(fields[`subhead${index}`]);
    const block = parseInfoboxTextField(fields[`text${index}`]);
    if (!head && !subhead && !block) return [];
    return [
      {
        head,
        text: block?.text ?? "",
        subscript: subhead ?? block?.subscript ?? null,
      },
    ];
  }).filter((row) => row.head || row.text || row.subscript);

  if (rows.length === 0) return [];

  const titled = rows.some((row) => row.head);
  if (!titled) {
    return [
      {
        title: "Description",
        blocks: rows.map((row) => ({
          text: row.text,
          subscript: row.subscript,
        })),
      },
    ];
  }

  return rows.map((row) => ({
    title: row.head ?? "Description",
    blocks:
      row.text || row.subscript
        ? [{ text: row.text, subscript: row.subscript }]
        : [],
  }));
}
