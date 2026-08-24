const CLOUDFLARE_BODY_HINTS = [
  "just a moment",
  "cf-browser-verification",
  "cf-challenge",
  "challenge-platform",
  "attention required",
  "enable javascript to pass antispam",
  "cloudflare",
  "sorry, you have been blocked",
];

export type CloudflareResponseHint = {
  status: number;
  contentType?: string | null;
  bodySnippet?: string | null;
  cfMitigated?: string | null;
};

/**
 * True when the response is a Cloudflare challenge/block rather than wiki JSON.
 * Does not attempt to solve challenges — callers must back off and retry later.
 */
export function isCloudflareBlock(response: CloudflareResponseHint): boolean {
  if (response.cfMitigated) return true;

  if (
    response.status === 403 ||
    response.status === 429 ||
    response.status === 503 ||
    response.status === 1020
  ) {
    const snippet = (response.bodySnippet ?? "").toLowerCase();
    const type = (response.contentType ?? "").toLowerCase();
    if (type.includes("text/html") || CLOUDFLARE_BODY_HINTS.some((hint) => snippet.includes(hint))) {
      return true;
    }
    if (response.status === 429) return true;
  }

  const type = (response.contentType ?? "").toLowerCase();
  const snippet = (response.bodySnippet ?? "").toLowerCase();
  if (type.includes("text/html") && CLOUDFLARE_BODY_HINTS.some((hint) => snippet.includes(hint))) {
    return true;
  }

  return false;
}

export function looksLikeHtml(contentType: string | null | undefined, bodySnippet: string): boolean {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("text/html")) return true;
  const trimmed = bodySnippet.trimStart().slice(0, 32).toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}
