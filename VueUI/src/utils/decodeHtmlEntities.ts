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
};

/** Decode HTML entities (numeric, hex, and common named entities). */
export function decodeHtmlEntities(input: string): string {
  let previous = "";
  let result = input;

  while (result !== previous) {
    previous = result;
    result = result.replace(/&#x([0-9a-fA-F]+);/gi, (match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    });
    result = result.replace(/&#(\d+);/g, (match, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    });
    result = result.replace(/&([a-zA-Z]+);/g, (match, name: string) => {
      return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name)
        ? NAMED_ENTITIES[name]!
        : match;
    });
  }

  return result;
}
