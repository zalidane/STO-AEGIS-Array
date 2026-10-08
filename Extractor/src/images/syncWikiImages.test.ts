import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  IMAGE_CACHE_CONTROL,
  contentTypeForFilename,
  etagMatchesMd5,
  extraneousKeys,
  md5Hex,
  needsUpload,
  readR2Config,
  type ObjectStore,
  type PutInput,
} from "./imageObjects.js";
import { syncWikiImages } from "./syncWikiImages.js";

describe("contentTypeForFilename", () => {
  it("maps jfif to jpeg and avif to image/avif, ignoring case", () => {
    assert.equal(contentTypeForFilename("Ship.jfif"), "image/jpeg");
    assert.equal(contentTypeForFilename("Ship.JFIF"), "image/jpeg");
    assert.equal(contentTypeForFilename("render.avif"), "image/avif");
    assert.equal(contentTypeForFilename("icon.PNG"), "image/png");
    assert.equal(contentTypeForFilename("photo.jpg"), "image/jpeg");
    assert.equal(contentTypeForFilename("notes.txt"), null);
    assert.equal(contentTypeForFilename("NOTICE"), null);
  });
});

describe("image cache policy", () => {
  it("uses a month-long public cache that is not immutable", () => {
    assert.equal(
      IMAGE_CACHE_CONTROL,
      "public, max-age=2592000, stale-while-revalidate=86400",
    );
    assert.equal(IMAGE_CACHE_CONTROL.includes("immutable"), false);
  });
});

describe("etagMatchesMd5", () => {
  it("accepts quoted single-part etags and rejects multipart etags", () => {
    assert.equal(etagMatchesMd5('"abc"', "abc"), true);
    assert.equal(etagMatchesMd5('W/"ABC"', "abc"), true);
    assert.equal(etagMatchesMd5('"abc-1"', "abc-1"), false);
    assert.equal(etagMatchesMd5(null, "abc"), false);
  });
});

describe("needsUpload", () => {
  const local = { md5: "abc", size: 4 };

  it("uploads when the object is missing, resized, or has a different etag", () => {
    assert.equal(needsUpload(local, undefined), true);
    assert.equal(
      needsUpload(local, { etag: '"abc"', size: 9 }),
      true,
    );
    assert.equal(
      needsUpload(local, { etag: '"zzz"', size: 4 }),
      true,
    );
    assert.equal(
      needsUpload(local, { etag: '"abc"', size: 4 }),
      false,
    );
  });
});

describe("extraneousKeys", () => {
  it("returns sorted remote keys that are not local", () => {
    assert.deepEqual(
      extraneousKeys(new Set(["ships/a.jpg"]), ["ships/b.jpg", "ships/a.jpg"]),
      ["ships/b.jpg"],
    );
  });
});

describe("readR2Config", () => {
  it("does not echo secret values when a required variable is missing", () => {
    const secret = "super-secret-value";
    assert.throws(
      () =>
        readR2Config({
          R2_SECRET_ACCESS_KEY: secret,
          R2_BUCKET: "aegis-images",
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /R2_ENDPOINT/);
        assert.match(error.message, /R2_ACCESS_KEY_ID/);
        assert.equal(error.message.includes(secret), false);
        return true;
      },
    );
  });

  it("strips a trailing slash and defaults the region to auto", () => {
    const config = readR2Config({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com/",
      R2_BUCKET: "aegis-images",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
    });
    assert.equal(config.endpoint, "https://account.r2.cloudflarestorage.com");
    assert.equal(config.region, "auto");
    assert.equal(config.bucket, "aegis-images");
  });

  it("rejects an endpoint that is not an absolute URL", () => {
    assert.throws(() =>
      readR2Config({
        R2_ENDPOINT: "not a url",
        R2_BUCKET: "aegis-images",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret",
      }),
    );
  });
});

function memoryStore(
  remote: { key: string; etag: string; size: number }[],
): ObjectStore & { puts: PutInput[]; deleted: string[][] } {
  const puts: PutInput[] = [];
  const deleted: string[][] = [];
  return {
    puts,
    deleted,
    async list(prefix) {
      return remote
        .filter((item) => item.key.startsWith(prefix))
        .map((item) => ({
          key: item.key,
          etag: item.etag,
          size: item.size,
        }));
    },
    async put(input) {
      puts.push(input);
      assert.equal(input.cacheControl, IMAGE_CACHE_CONTROL);
      assert.equal(input.contentLength, input.body.byteLength);
    },
    async delete(keys) {
      deleted.push([...keys]);
    },
  };
}

describe("syncWikiImages", () => {
  it("uploads changed files with jfif/avif content types and skips matches", async () => {
    const root = await mkdtemp(join(tmpdir(), "image-sync-"));
    const jfif = Buffer.from("jfif-bytes");
    const avif = Buffer.from("avif-bytes");
    const png = Buffer.from("png-bytes");
    await mkdir(join(root, "ships"), { recursive: true });
    await mkdir(join(root, "items"), { recursive: true });
    await writeFile(join(root, "NOTICE"), "keep local\n");
    await writeFile(join(root, "ships", "Demo.jfif"), jfif);
    await writeFile(join(root, "ships", "Photo.avif"), avif);
    await writeFile(join(root, "ships", "ship-placeholder.png"), png);
    await writeFile(join(root, "ships", "notes.txt"), "nope");
    await writeFile(join(root, "items", "Icon.PNG"), png);

    const store = memoryStore([
      {
        key: "ships/Demo.jfif",
        etag: `"${md5Hex(jfif)}"`,
        size: jfif.byteLength,
      },
      { key: "ships/old.jpg", etag: '"gone"', size: 3 },
      { key: "traits/old.png", etag: '"gone"', size: 3 },
    ]);

    const report = await syncWikiImages({
      imagesDir: root,
      store,
      dryRun: false,
      deleteExtraneous: true,
    });

    assert.deepEqual(
      store.puts
        .map((put) => [put.key, put.contentType])
        .sort((a, b) => a[0]!.localeCompare(b[0]!)),
      [
        ["items/Icon.PNG", "image/png"],
        ["ships/Photo.avif", "image/avif"],
      ],
    );
    assert.equal(report.unchanged, 1);
    assert.deepEqual(report.deleted, ["ships/old.jpg"]);
    assert.deepEqual(store.deleted, [["ships/old.jpg"]]);
    assert.equal(
      report.skipped.some((skip) => skip.path === "NOTICE"),
      true,
    );
    assert.equal(
      report.skipped.some((skip) => skip.path === "ships/ship-placeholder.png"),
      true,
    );
    assert.equal(
      report.skipped.some((skip) => skip.path === "ships/notes.txt"),
      true,
    );
    assert.equal(report.contentTypes["image/jpeg"], 1);
    assert.equal(report.contentTypes["image/avif"], 1);
    assert.equal(report.contentTypes["image/png"], 1);
  });

  it("does not write during a dry run", async () => {
    const root = await mkdtemp(join(tmpdir(), "image-sync-dry-"));
    await mkdir(join(root, "ships"), { recursive: true });
    await writeFile(join(root, "ships", "A.jpg"), Buffer.from("ship"));
    const store = memoryStore([]);

    const report = await syncWikiImages({
      imagesDir: root,
      store,
      dryRun: true,
      deleteExtraneous: true,
    });

    assert.deepEqual(report.uploaded, ["ships/A.jpg"]);
    assert.equal(store.puts.length, 0);
    assert.equal(store.deleted.length, 0);
    assert.equal(report.dryRun, true);
    assert.equal(report.comparedRemote, true);
  });

  it("lists local files without a store when dry-run has no credentials", async () => {
    const root = await mkdtemp(join(tmpdir(), "image-sync-local-"));
    await mkdir(join(root, "traits"), { recursive: true });
    await writeFile(join(root, "traits", "A.png"), Buffer.from("icon"));

    const report = await syncWikiImages({
      imagesDir: root,
      store: null,
      dryRun: true,
      deleteExtraneous: false,
    });

    assert.deepEqual(report.uploaded, ["traits/A.png"]);
    assert.equal(report.comparedRemote, false);
    assert.equal(report.deleted.length, 0);
  });

  it("refuses to upload when the image directory is missing", async () => {
    await assert.rejects(() =>
      syncWikiImages({
        imagesDir: join(tmpdir(), "missing-images-dir"),
        store: null,
        dryRun: true,
        deleteExtraneous: false,
      }),
    );
  });
});
