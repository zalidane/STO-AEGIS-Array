import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";

/**
 * Flatten wiki/HTML markup into readable plain text.
 * Links become their display labels; File tokens and leftover tags are dropped.
 */
export function normalizeWikiPlainText(raw: string): string {
  let value = decodeHtmlEntities(raw);
  value = decodeHtmlEntities(value);
  value = value.replace(/<br\s*\/?>/gi, "\n");
  value = value.replace(/<hr\s*\/?>/gi, "\n");
  value = value.replace(/<\/?(?:li|ul|ol|p|div|tr|td|th)[^>]*>/gi, "\n");
  value = value.replace(/<[^>]+>/g, "");
  value = flattenWikiLinks(value);
  return value.replace(/\u00A0/g, " ");
}

function flattenWikiLinks(value: string): string {
  let previous = "";
  let result = value.replace(/\{\{!\}\}/g, "|");
  while (result !== previous) {
    previous = result;
    result = result.replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "");
    result = result.replace(
      /\[\[(?:[^\]|#]+(?:#[^\]|]*)?)\|([^\]]+)\]\]/g,
      (_match, label: string) => label.trim(),
    );
    result = result.replace(
      /\[\[([^\]|#]+)(?:#[^\]|]*)?\]\]/g,
      (_match, page: string) => page.replace(/_/g, " ").trim(),
    );
    result = result.replace(/\[\[([^[\]]+)\]\]/g, (_match, inner: string) => {
      const pipe = inner.lastIndexOf("|");
      const label = pipe >= 0 ? inner.slice(pipe + 1) : inner;
      return label.replace(/_/g, " ").replace(/#.*$/, "").trim();
    });
    result = result.replace(
      /\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/gi,
      "$1",
    );
    result = result.replace(/\[https?:\/\/[^\s\]]+\]/gi, "");
  }
  return result;
}
