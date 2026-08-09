const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201D",
  ldquo: "\u201C",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  copy: "\u00A9",
  reg: "\u00AE",
  trade: "\u2122",
  times: "\u00D7",
  divide: "\u00F7",
  bull: "\u2022",
  deg: "\u00B0",
};

/**
 * Decode HTML entities in a string (numeric, hex, and common named entities).
 * Runs to a fixed point so double-encoded values like `&amp;#039;` also clear.
 */
export function decodeHtmlEntities(input: string): string {
  let previous = "";
  let result = input;

  while (result !== previous) {
    previous = result;
    result = result.replace(/&#x([0-9a-fA-F]+);/gi, (_match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? _match : String.fromCodePoint(code);
    });
    result = result.replace(/&#(\d+);/g, (_match, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isNaN(code) ? _match : String.fromCodePoint(code);
    });
    result = result.replace(/&([a-zA-Z]+);/g, (match, name: string) => {
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name)
        ? NAMED_ENTITIES[name]!
        : match;
    });
  }

  return result;
}

export function decodeHtmlEntitiesOrNull(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") return null;
  return decodeHtmlEntities(value);
}
