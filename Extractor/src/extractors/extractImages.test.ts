import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import type { ObjectStore } from "../images/imageObjects";
import type { WikiClient } from "../wiki/client";
import { BROWSER_REPORT_FILENAME, extractImages, type ImageIndexRecord } from "./extractImages";

const offlineWiki = new Proxy({} as WikiClient, {
  get() {
    throw new Error("--no-fetch must not touch the wiki client");
  },
});

function listingStore(keys: string[]): ObjectStore {
  return {
    list: async (prefix) =>
      keys.filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: null, size: 1 })),
    put: async () => {
      throw new Error("no uploads");
    },
    delete: async () => {
      throw new Error("no deletes");
    },
  };
}

describe("extractImages --no-fetch", () => {
  it("stamps browser-downloaded files and records the rest without wiki requests", async () => {
    const root = await mkdtemp(join(tmpdir(), "extract-images-offline-"));
    const cargoDir = join(root, "output");
    const imagesDir = join(root, "images");
    await mkdir(join(imagesDir, "items"), { recursive: true });
    await mkdir(cargoDir, { recursive: true });

    await writeFile(
      join(cargoDir, "Infobox.json"),
      JSON.stringify([
        { name: "Temporal Disruptor Beam Array" },
        { name: "Phaser Beam Array" },
        { name: "Advanced Chromodynamic Armor" },
        { name: "Unrefined Ketracel" },
      ]),
    );
    await writeFile(
      join(cargoDir, "imageIndex.json"),
      JSON.stringify([
        {
          kind: "items",
          wikiTitle: "File:Phaser Beam Array icon.png",
          localFilename: "Phaser_Beam_Array_icon.png",
          localPath: "/images/items/Phaser_Beam_Array_icon.png",
          url: "https://stowiki.net/w/images/x/Phaser_Beam_Array_icon.png",
          status: "exists",
          bytes: 9,
          official: false,
        },
      ]),
    );
    // Downloaded by the browser script.
    await writeFile(join(imagesDir, "items", "Temporal_Disruptor_Beam_Array_icon.png"), "png");
    await writeFile(
      join(imagesDir, BROWSER_REPORT_FILENAME),
      JSON.stringify({
        missing: [
          {
            kind: "items",
            localFilename: "Advanced_Chromodynamic_Armor_icon.png",
            wikiTitle: "File:Advanced Chromodynamic Armor icon.png",
          },
        ],
      }),
    );

    const result = await extractImages(offlineWiki, {
      cargoDir,
      imagesDir,
      force: false,
      noFetch: true,
      store: listingStore(["items/Phaser_Beam_Array_icon.png"]),
    });

    const index = JSON.parse(await readFile(join(cargoDir, "imageIndex.json"), "utf8")) as ImageIndexRecord[];
    const status = Object.fromEntries(index.map((row) => [row.localFilename, row.status]));
    assert.equal(status["Temporal_Disruptor_Beam_Array_icon.png"], "exists");
    assert.equal(status["Phaser_Beam_Array_icon.png"], "exists");
    assert.equal(status["Advanced_Chromodynamic_Armor_icon.png"], "missing");
    assert.equal(status["Unrefined_Ketracel_icon.png"], "failed");
    assert.equal(result.toFetch.length, 2);

    const infobox = JSON.parse(await readFile(join(cargoDir, "Infobox.json"), "utf8")) as Array<{
      name: string;
      image?: string | null;
    }>;
    const image = Object.fromEntries(infobox.map((row) => [row.name, row.image ?? null]));
    assert.equal(image["Temporal Disruptor Beam Array"], "Temporal_Disruptor_Beam_Array_icon.png");
    assert.equal(image["Phaser Beam Array"], "Phaser_Beam_Array_icon.png");
    assert.equal(image["Unrefined Ketracel"], null);
  });
});
