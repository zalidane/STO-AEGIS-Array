import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { WikiClient } from "../wiki/client";
import type { ImageInfo } from "../wiki/client";
import { matchKey } from "../wiki/filenames";
import { catalogImageTargets, applyImageIndexToInfoboxes, applyImageIndexToTraySkills, type CatalogImageSource } from "../wiki/imageTargets";
import { decideImageFetch } from "../wiki/imageSync";
import { alignCatalogImageFiles } from "../wiki/localImageFiles";
import type { ImageTarget } from "../wiki/filenames";
import type { ObjectStore } from "../images/imageObjects";
import {
  buildRemoteImagePresence,
  type RemoteImagePresence,
} from "../images/remoteImagePresence";

const OFFICIAL_CATEGORY = "Category:Official images";
const IMAGE_INFO_BATCH = 20;
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;

export type ImageExtractOptions = {
  cargoDir: string;
  imagesDir: string;
  force: boolean;
  /** Print what would be fetched and exit: no wiki requests, no file writes. */
  plan?: boolean;
  /**
   * Treat prior index rows (exists/downloaded) as done when the public image
   * host still has them. Default true. `false` restores local-disk-only checks.
   */
  remoteCheck?: boolean;
  /** R2 store from the images:sync settings, when credentials are set. */
  store?: ObjectStore | null;
  /** Public image base (VITE_IMAGE_BASE_URL), used for HEAD checks without R2. */
  imageBaseUrl?: string | null;
  /**
   * Never contact the wiki. Rebuild imageIndex.json from local + remote state;
   * titles still to fetch are recorded as `missing` when the browser
   * downloader's report says the wiki has no such file, else `failed` (so a
   * later online run retries them).
   */
  noFetch?: boolean;
};

export type ImageExtractResult = { toFetch: ImageTarget[] };

/** Written by the DevTools browser downloader into VueUI/public/images/. */
export const BROWSER_REPORT_FILENAME = "browser-download-report.json";

type BrowserReport = {
  missing?: Array<{ kind?: string; localFilename?: string; wikiTitle?: string }>;
};

export type ImageIndexRecord = {
  kind: ImageTarget["kind"];
  wikiTitle: string;
  localFilename: string;
  localPath: string;
  url: string | null;
  status: "downloaded" | "exists" | "missing" | "skipped" | "failed";
  bytes: number | null;
  official: boolean;
};

type PriorIndexRow = Partial<ImageIndexRecord> & {
  kind: ImageIndexRecord["kind"];
  wikiTitle: string;
  status: string;
};

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function priorIndexKey(kind: ImageTarget["kind"], wikiTitle: string): string {
  return `${kind}:${matchKey(wikiTitle)}`;
}

function loadPriorIndex(rows: readonly PriorIndexRow[]): Map<string, PriorIndexRow> {
  const map = new Map<string, PriorIndexRow>();
  for (const row of rows) {
    map.set(priorIndexKey(row.kind, row.wikiTitle), row);
  }
  return map;
}

export async function extractImages(
  wiki: WikiClient,
  options: ImageExtractOptions,
): Promise<ImageExtractResult> {
  const ships = (await readJsonFile<CatalogImageSource["ships"]>(join(options.cargoDir, "Ships.json"))) ?? [];
  const traits = (await readJsonFile<CatalogImageSource["traits"]>(join(options.cargoDir, "Traits.json"))) ?? [];
  const starshipTraits =
    (await readJsonFile<CatalogImageSource["starshipTraits"]>(
      join(options.cargoDir, "StarshipTraits.json"),
    )) ?? [];
  const infoboxes =
    (await readJsonFile<Array<{ name: string; image?: string | null }>>(
      join(options.cargoDir, "Infobox.json"),
    )) ?? [];
  const traySkills =
    (await readJsonFile<Array<{ name: string }>>(join(options.cargoDir, "TraySkill.json"))) ?? [];

  const targets = catalogImageTargets({ ships, traits, starshipTraits, infoboxes, traySkills });
  console.log(`Images: ${targets.length} unique catalog files`);

  if (targets.length === 0) {
    console.log("Images: no catalog JSON found. Run a cargo extract first.");
    return { toFetch: [] };
  }

  if (!options.plan) {
    const aligned = await alignCatalogImageFiles(options.imagesDir, targets);
    if (aligned.renamed > 0) {
      console.log(
        `Images: renamed ${aligned.renamed} files onto apostrophe- and ampersand-free, case-accurate public names`,
      );
    }
  }

  const priorIndex = loadPriorIndex(
    (await readJsonFile<PriorIndexRow[]>(join(options.cargoDir, "imageIndex.json"))) ?? [],
  );

  const skipLocal: Array<{ target: ImageTarget; prior: PriorIndexRow | undefined; bytes: number }> = [];
  const skipRemote: Array<{ target: ImageTarget; prior: PriorIndexRow }> = [];
  const skipMissing: Array<{ target: ImageTarget; prior: PriorIndexRow }> = [];
  const toFetch: ImageTarget[] = [];

  const scanned: Array<{ target: ImageTarget; prior: PriorIndexRow | undefined; localBytes: number | null }> = [];
  for (const target of targets) {
    const localPath = join(options.imagesDir, target.kind, target.localFilename);
    scanned.push({
      target,
      prior: priorIndex.get(priorIndexKey(target.kind, target.wikiTitle)),
      localBytes: await existingFileSize(localPath),
    });
  }

  const remote = await remotePresenceFor(options, scanned);

  for (const { target, prior, localBytes } of scanned) {
    const decision = decideImageFetch({
      force: options.force,
      localBytes,
      priorStatus: prior?.status ?? null,
      remotePresent: remote ? remote.has(target.kind, target.localFilename) : null,
    });

    if (decision === "skip-local" && localBytes != null) {
      skipLocal.push({ target, prior, bytes: localBytes });
    } else if (decision === "skip-remote" && prior) {
      skipRemote.push({ target, prior });
    } else if (decision === "skip-known-missing" && prior) {
      skipMissing.push({ target, prior });
    } else {
      toFetch.push(target);
    }
  }

  console.log(
    `Images: ${skipLocal.length} already on disk, ${skipRemote.length} already on image host, ${skipMissing.length} known missing, ${toFetch.length} new to fetch`,
  );

  if (options.plan) {
    for (const target of toFetch) {
      const prior = priorIndex.get(priorIndexKey(target.kind, target.wikiTitle));
      console.log(
        `  fetch ${target.kind}/${target.localFilename}  (${target.wikiTitle}; prior ${prior?.status ?? "none"})`,
      );
    }
    console.log("Images: --plan only; no wiki requests made and no files written");
    return { toFetch };
  }

  const index: ImageIndexRecord[] = [];
  let downloaded = 0;
  let existed = skipLocal.length + skipRemote.length;
  let missing = skipMissing.filter((row) => row.prior.status === "missing").length;
  let skipped = skipMissing.filter((row) => row.prior.status === "skipped").length;
  let failed = 0;

  for (const row of skipLocal) {
    index.push({
      kind: row.target.kind,
      wikiTitle: row.target.wikiTitle,
      localFilename: row.target.localFilename,
      localPath: `/images/${row.target.kind}/${row.target.localFilename}`,
      url: row.prior?.url ?? null,
      status: "exists",
      bytes: row.bytes,
      official: row.prior?.official ?? false,
    });
  }

  // Already in object storage: keep the row as `exists` so Infobox / tray
  // stamping still points at the hosted file. images:sync only uploads local
  // files and never deletes without --delete, so these stay untouched.
  for (const row of skipRemote) {
    index.push({
      kind: row.target.kind,
      wikiTitle: row.target.wikiTitle,
      localFilename: row.target.localFilename,
      localPath: `/images/${row.target.kind}/${row.target.localFilename}`,
      url: row.prior.url ?? null,
      status: "exists",
      bytes: row.prior.bytes ?? null,
      official: row.prior.official ?? false,
    });
  }

  for (const row of skipMissing) {
    const status = row.prior.status === "skipped" ? "skipped" : "missing";
    index.push({
      kind: row.target.kind,
      wikiTitle: row.target.wikiTitle,
      localFilename: row.target.localFilename,
      localPath: `/images/${row.target.kind}/${row.target.localFilename}`,
      url: row.prior.url ?? null,
      status,
      bytes: row.prior.bytes ?? null,
      official: row.prior.official ?? false,
    });
  }

  if (toFetch.length > 0 && options.noFetch) {
    const reportMissing = await browserReportMissing(options.imagesDir);
    for (const target of toFetch) {
      const isMissing = reportMissing.has(priorIndexKey(target.kind, target.wikiTitle));
      const prior = priorIndex.get(priorIndexKey(target.kind, target.wikiTitle));
      if (isMissing) missing += 1;
      else failed += 1;
      index.push({
        kind: target.kind,
        wikiTitle: target.wikiTitle,
        localFilename: target.localFilename,
        localPath: `/images/${target.kind}/${target.localFilename}`,
        url: isMissing ? null : prior?.url ?? null,
        status: isMissing ? "missing" : "failed",
        bytes: null,
        official: prior?.official ?? false,
      });
    }
    console.log(
      `Images: --no-fetch: recorded ${toFetch.length} unfetched titles without contacting the wiki (${reportMissing.size} known-missing from ${BROWSER_REPORT_FILENAME})`,
    );
  } else if (toFetch.length > 0) {
    await wiki.login();
    const fetched = await fetchAndDownload(wiki, options, toFetch);
    index.push(...fetched.index);
    downloaded += fetched.downloaded;
    existed += fetched.existed;
    missing += fetched.missing;
    skipped += fetched.skipped;
    failed += fetched.failed;
  } else {
    console.log("Images: nothing new to download; skipping wiki image requests");
  }

  await writeFile(join(options.cargoDir, "imageIndex.json"), JSON.stringify(index, null, 2));

  if (infoboxes.length > 0) {
    const stamped = applyImageIndexToInfoboxes(infoboxes, index);
    await writeFile(join(options.cargoDir, "Infobox.json"), JSON.stringify(stamped, null, 2));
    const withImage = stamped.filter((row) => row.image).length;
    console.log(`Images: stamped ${withImage}/${stamped.length} infobox image filenames into Infobox.json`);
  }

  if (traySkills.length > 0) {
    const stamped = applyImageIndexToTraySkills(traySkills, index);
    await writeFile(join(options.cargoDir, "TraySkill.json"), JSON.stringify(stamped, null, 2));
    const withImage = stamped.filter((row) => row.image).length;
    console.log(`Images: stamped ${withImage}/${stamped.length} tray-skill image filenames into TraySkill.json`);
  }

  console.log(
    `Images: downloaded ${downloaded}, existed ${existed}, missing ${missing}, skipped ${skipped}, failed ${failed}`,
  );
  return { toFetch };
}

/** Titles the browser downloader found absent on the wiki (HTTP 404). */
async function browserReportMissing(imagesDir: string): Promise<Set<string>> {
  const report = await readJsonFile<BrowserReport>(join(imagesDir, BROWSER_REPORT_FILENAME));
  const keys = new Set<string>();
  for (const row of report?.missing ?? []) {
    if (!row.kind || !row.wikiTitle) continue;
    keys.add(priorIndexKey(row.kind as ImageTarget["kind"], row.wikiTitle));
  }
  return keys;
}

const PRESENT_STATUSES = new Set(["exists", "downloaded"]);

async function remotePresenceFor(
  options: ImageExtractOptions,
  scanned: ReadonlyArray<{ target: ImageTarget; prior: PriorIndexRow | undefined; localBytes: number | null }>,
): Promise<RemoteImagePresence | null> {
  if (options.force || options.remoteCheck === false) return null;
  const candidates = scanned
    .filter(
      (row) =>
        row.localBytes == null &&
        row.prior != null &&
        PRESENT_STATUSES.has(row.prior.status),
    )
    .map((row) => ({ kind: row.target.kind, localFilename: row.target.localFilename }));
  if (candidates.length === 0) return null;
  const presence = await buildRemoteImagePresence({
    candidates,
    store: options.store ?? null,
    baseUrl: options.imageBaseUrl ?? null,
    log: (message) => console.warn(message),
  });
  console.log(`Images: remote check (${presence.mode}): ${presence.summary}`);
  return presence;
}

async function fetchAndDownload(
  wiki: WikiClient,
  options: ImageExtractOptions,
  toFetch: readonly ImageTarget[],
): Promise<{
  index: ImageIndexRecord[];
  downloaded: number;
  existed: number;
  missing: number;
  skipped: number;
  failed: number;
}> {
  const officialPath = join(options.cargoDir, "OfficialImages.json");
  const officialByKey = new Map<string, ImageInfo>();

  if (options.force) {
    console.log(`Images: listing ${OFFICIAL_CATEGORY} (Cryptic-provided files)`);
    const official = await wiki.categoryFiles(OFFICIAL_CATEGORY, IMAGE_INFO_BATCH);
    await writeFile(
      officialPath,
      JSON.stringify(
        official.map((file) => ({
          title: file.title,
          url: file.url,
          size: file.size,
          mime: file.mime,
          missing: file.missing,
        })),
        null,
        2,
      ),
    );
    console.log(`Images: saved ${official.length} official file records`);
    for (const file of official) {
      if (!file.title) continue;
      officialByKey.set(matchKey(file.title), file);
    }
  } else {
    const cached =
      (await readJsonFile<Array<{
        title: string;
        url: string | null;
        size: number | null;
        mime: string | null;
        missing?: boolean;
      }>>(officialPath)) ?? [];
    for (const file of cached) {
      if (!file.title) continue;
      officialByKey.set(matchKey(file.title), {
        title: file.title,
        url: file.url,
        size: file.size,
        mime: file.mime,
        missing: file.missing ?? false,
      });
    }
    if (cached.length > 0) {
      console.log(`Images: using cached Official images list (${cached.length} files)`);
    }
  }

  const unresolved: ImageTarget[] = [];
  const resolved = new Map<string, { target: ImageTarget; info: ImageInfo; official: boolean }>();

  for (const target of toFetch) {
    const officialHit = officialByKey.get(matchKey(target.wikiTitle));
    if (officialHit?.url && !officialHit.missing) {
      resolved.set(priorIndexKey(target.kind, target.wikiTitle), {
        target,
        info: officialHit,
        official: true,
      });
    } else {
      unresolved.push(target);
    }
  }

  console.log(`Images: ${resolved.size} matched official cache, ${unresolved.length} need imageinfo`);

  for (let i = 0; i < unresolved.length; i += IMAGE_INFO_BATCH) {
    const batch = unresolved.slice(i, i + IMAGE_INFO_BATCH);
    console.log(`Images: imageinfo ${i + 1}–${Math.min(i + batch.length, unresolved.length)} / ${unresolved.length}`);
    const infos = await wiki.imageInfo(batch.map((row) => row.wikiTitle));
    const infoByKey = new Map(infos.map((info) => [matchKey(info.title), info]));
    for (const target of batch) {
      const info = infoByKey.get(matchKey(target.wikiTitle)) ?? {
        title: target.wikiTitle,
        missing: true,
        url: null,
        mime: null,
        size: null,
      };
      resolved.set(priorIndexKey(target.kind, target.wikiTitle), {
        target,
        info,
        official: false,
      });
    }
  }

  const index: ImageIndexRecord[] = [];
  let downloaded = 0;
  let existed = 0;
  let missing = 0;
  let skipped = 0;
  let failed = 0;

  const rows = [...resolved.values()];
  for (const [i, row] of rows.entries()) {
    const localPath = join(options.imagesDir, row.target.kind, row.target.localFilename);
    const publicPath = `/images/${row.target.kind}/${row.target.localFilename}`;

    if (row.info.missing || !row.info.url) {
      missing += 1;
      index.push(indexRow(row, publicPath, "missing", null, null));
      continue;
    }

    if (row.info.size != null && row.info.size > MAX_DOWNLOAD_BYTES) {
      skipped += 1;
      index.push(indexRow(row, publicPath, "skipped", row.info.url, row.info.size));
      continue;
    }

    const already = await existingFileSize(localPath);
    if (already != null && !options.force) {
      existed += 1;
      index.push(indexRow(row, publicPath, "exists", row.info.url, already));
      continue;
    }

    try {
      console.log(`Images: download ${i + 1}/${rows.length} ${row.target.kind}/${row.target.localFilename}`);
      const bytes = await wiki.downloadFile(row.info.url);
      await mkdir(dirname(localPath), { recursive: true });
      await writeFile(localPath, bytes);
      downloaded += 1;
      index.push(indexRow(row, publicPath, "downloaded", row.info.url, bytes.length));
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Images: failed ${row.target.wikiTitle}: ${message}`);
      index.push(indexRow(row, publicPath, "failed", row.info.url, null));
    }
  }

  return { index, downloaded, existed, missing, skipped, failed };
}

function indexRow(
  row: { target: ImageTarget; official: boolean },
  localPath: string,
  status: ImageIndexRecord["status"],
  url: string | null,
  bytes: number | null,
): ImageIndexRecord {
  return {
    kind: row.target.kind,
    wikiTitle: row.target.wikiTitle,
    localFilename: row.target.localFilename,
    localPath,
    url,
    status,
    bytes,
    official: row.official,
  };
}

async function existingFileSize(path: string): Promise<number | null> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0 ? info.size : null;
  } catch {
    return null;
  }
}
