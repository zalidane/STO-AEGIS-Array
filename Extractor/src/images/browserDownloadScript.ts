import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ImageTarget } from "../wiki/filenames.js";

/**
 * Generates a self-contained DevTools-console script that downloads planned
 * wiki images from a browser tab that has already passed Cloudflare. See
 * browserDownload.template.js and Extractor/README.md.
 */
export type BrowserDownloadEntry = {
  kind: string;
  localFilename: string;
  wikiTitle: string;
  /** MediaWiki file name: no `File:` prefix, underscores, first letter upper-cased. */
  fileName: string;
  /** Same-origin hashed upload path, e.g. /w/images/Wiki_Images/sto_images/e/e1/X.png */
  directPath: string;
};

export const WIKI_UPLOAD_PREFIX = "/w/images/Wiki_Images/sto_images";

export function wikiFileName(wikiTitle: string): string {
  const bare = wikiTitle.replace(/^File:/i, "").trim().replace(/\s+/g, "_");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** MediaWiki hashed upload path: /{md5[0]}/{md5[0..1]}/{name}. */
export function wikiUploadPath(fileName: string): string {
  const hash = createHash("md5").update(fileName, "utf8").digest("hex");
  return `${WIKI_UPLOAD_PREFIX}/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(fileName)}`;
}

export function browserDownloadEntries(
  targets: readonly Pick<ImageTarget, "kind" | "localFilename" | "wikiTitle">[],
): BrowserDownloadEntry[] {
  return targets.map((target) => {
    const fileName = wikiFileName(target.wikiTitle);
    return {
      kind: target.kind,
      localFilename: target.localFilename,
      wikiTitle: target.wikiTitle,
      fileName,
      directPath: wikiUploadPath(fileName),
    };
  });
}

export async function buildBrowserDownloadScript(
  entries: readonly BrowserDownloadEntry[],
  generatedAt: Date = new Date(),
): Promise<string> {
  const template = await readFile(
    resolve(__dirname, "browserDownload.template.js"),
    "utf8",
  );
  const stamp = generatedAt.toISOString();
  // `</` is escaped so the payload can never close a <script> if pasted into HTML.
  const json = JSON.stringify(entries, null, 2).replace(/<\//g, "<\\/");
  return template
    .split("__GENERATED_AT__").join(stamp)
    .split("__COUNT__").join(String(entries.length))
    .replace("__ENTRIES__", () => json);
}
