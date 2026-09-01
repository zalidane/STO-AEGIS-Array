import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { WikiClient } from "../wiki/client";
import type { ImageInfo } from "../wiki/client";
import { matchKey } from "../wiki/filenames";
import { catalogImageTargets, applyImageIndexToInfoboxes, applyImageIndexToTraySkills, type CatalogImageSource } from "../wiki/imageTargets";
import { decideImageFetch } from "../wiki/imageSync";
import { alignCatalogImageFiles } from "../wiki/localImageFiles";
import type { ImageTarget } from "../wiki/filenames";

const OFFICIAL_CATEGORY = "Category:Official images";
const IMAGE_INFO_BATCH = 20;
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;

export type ImageExtractOptions = {
  cargoDir: string;
  imagesDir: string;
  force: boolean;
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
): Promise<void> {
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
    return;
  }

  const aligned = await alignCatalogImageFiles(options.imagesDir, targets);
  if (aligned.renamed > 0) {
    console.log(
      `Images: renamed ${aligned.renamed} files onto apostrophe-free, case-accurate public names`,
    );
  }

  const priorIndex = loadPriorIndex(
    (await readJsonFile<PriorIndexRow[]>(join(options.cargoDir, "imageIndex.json"))) ?? [],
  );

  const skipLocal: Array<{ target: ImageTarget; prior: PriorIndexRow | undefined; bytes: number }> = [];
  const skipMissing: Array<{ target: ImageTarget; prior: PriorIndexRow }> = [];
  const toFetch: ImageTarget[] = [];

  for (const target of targets) {
    const localPath = join(options.imagesDir, target.kind, target.localFilename);
    const already = await existingFileSize(localPath);
    const prior = priorIndex.get(priorIndexKey(target.kind, target.wikiTitle));
    const decision = decideImageFetch({
      force: options.force,
      localBytes: already,
      priorStatus: prior?.status ?? null,
    });

    if (decision === "skip-local" && already != null) {
      skipLocal.push({ target, prior, bytes: already });
    } else if (decision === "skip-known-missing" && prior) {
      skipMissing.push({ target, prior });
    } else {
      toFetch.push(target);
    }
  }

  console.log(
    `Images: ${skipLocal.length} already on disk, ${skipMissing.length} known missing, ${toFetch.length} new to fetch`,
  );

  const index: ImageIndexRecord[] = [];
  let downloaded = 0;
  let existed = skipLocal.length;
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

  if (toFetch.length > 0) {
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
