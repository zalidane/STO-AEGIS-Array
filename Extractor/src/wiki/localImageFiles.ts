import { readdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { imageFileMatchKey, type ImageKind, type ImageTarget } from "./filenames";

export type ImageDirIndex = Map<string, string>;

export async function readImageDirIndex(dir: string): Promise<ImageDirIndex> {
  const index: ImageDirIndex = new Map();
  try {
    const names = await readdir(dir);
    for (const name of names) {
      index.set(imageFileMatchKey(name), name);
    }
  } catch {
    // Directory may not exist yet on a fresh extract.
  }
  return index;
}

async function fileSize(path: string): Promise<number | null> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0 ? info.size : null;
  } catch {
    return null;
  }
}

/**
 * NTFS treats `Obeliskcarrier.jpg` and `obeliskcarrier.jpg` as the same file.
 * Rename through a temp name so git and Linux see the canonical case.
 */
async function renamePreservingOnWindows(fromPath: string, toPath: string): Promise<void> {
  if (fromPath === toPath) return;
  if (fromPath.toLowerCase() === toPath.toLowerCase()) {
    const tempPath = `${toPath}.tmp-case`;
    await rename(fromPath, tempPath);
    await rename(tempPath, toPath);
    return;
  }
  await rename(fromPath, toPath);
}

export type AlignResult = {
  bytes: number | null;
  renamedFrom: string | null;
};

/** Point a catalog filename at the matching on-disk file, renaming if case, apostrophes, or ampersands differ. */
export async function alignLocalImageFile(
  dir: string,
  canonicalFilename: string,
  index: ImageDirIndex,
): Promise<AlignResult> {
  const canonicalPath = join(dir, canonicalFilename);
  const key = imageFileMatchKey(canonicalFilename);
  const foundName = index.get(key);

  if (foundName && foundName !== canonicalFilename) {
    const fromPath = join(dir, foundName);
    const foundBytes = await fileSize(fromPath);
    if (foundBytes == null) {
      index.delete(key);
    } else {
      await renamePreservingOnWindows(fromPath, canonicalPath);
      index.set(key, canonicalFilename);
      return { bytes: foundBytes, renamedFrom: foundName };
    }
  }

  const exactBytes = await fileSize(canonicalPath);
  if (exactBytes != null) {
    index.set(key, canonicalFilename);
    return { bytes: exactBytes, renamedFrom: null };
  }

  return { bytes: null, renamedFrom: null };
}

export type AlignCatalogResult = {
  renamed: number;
  recased: Array<{ kind: ImageKind; from: string; to: string }>;
};

export async function alignCatalogImageFiles(
  imagesDir: string,
  targets: readonly ImageTarget[],
): Promise<AlignCatalogResult> {
  const indexes = new Map<ImageKind, ImageDirIndex>();
  let renamed = 0;
  const recased: AlignCatalogResult["recased"] = [];

  for (const target of targets) {
    let index = indexes.get(target.kind);
    if (!index) {
      index = await readImageDirIndex(join(imagesDir, target.kind));
      indexes.set(target.kind, index);
    }
    const result = await alignLocalImageFile(
      join(imagesDir, target.kind),
      target.localFilename,
      index,
    );
    if (!result.renamedFrom) continue;
    renamed += 1;
    if (result.renamedFrom.toLowerCase() === target.localFilename.toLowerCase()) {
      recased.push({
        kind: target.kind,
        from: result.renamedFrom,
        to: target.localFilename,
      });
    }
  }

  return { renamed, recased };
}
