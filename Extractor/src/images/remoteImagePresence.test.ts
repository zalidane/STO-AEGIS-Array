import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ObjectStore } from "./imageObjects.js";
import {
  buildRemoteImagePresence,
  publicImageUrl,
  resolveImageBaseUrl,
} from "./remoteImagePresence.js";

const candidates = [
  { kind: "items", localFilename: "Phaser_Beam_Array_icon.png" },
  { kind: "items", localFilename: "Gone_icon.png" },
  { kind: "traits", localFilename: "Astrophysicist_icon.png" },
];

function fakeStore(keys: string[], fail = false): ObjectStore {
  return {
    async list(prefix) {
      if (fail) throw new Error("denied");
      return keys
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key, etag: null, size: 1 }));
    },
    async put() {
      throw new Error("must not upload");
    },
    async delete() {
      throw new Error("must not delete");
    },
  };
}

describe("remote image presence", () => {
  it("uses the R2 listing when a store is available", async () => {
    const presence = await buildRemoteImagePresence({
      candidates,
      store: fakeStore(["items/Phaser_Beam_Array_icon.png", "traits/Astrophysicist_icon.png"]),
    });
    assert.equal(presence.mode, "r2");
    assert.equal(presence.has("items", "Phaser_Beam_Array_icon.png"), true);
    assert.equal(presence.has("items", "Gone_icon.png"), false);
    assert.equal(presence.has("traits", "Astrophysicist_icon.png"), true);
  });

  it("falls back to HEAD requests; 404 is absent, errors are trusted", async () => {
    const seen: string[] = [];
    const presence = await buildRemoteImagePresence({
      candidates,
      store: fakeStore([], true),
      baseUrl: "https://img.example.com/",
      retryDelayMs: 0,
      fetchImpl: async (url, init) => {
        assert.equal(init.method, "HEAD");
        seen.push(url);
        if (url.endsWith("Gone_icon.png")) return { status: 404 };
        if (url.includes("/traits/")) throw new Error("network");
        return { status: 200 };
      },
      log: () => {},
    });
    assert.equal(presence.mode, "http");
    assert.equal(presence.has("items", "Phaser_Beam_Array_icon.png"), true);
    assert.equal(presence.has("items", "Gone_icon.png"), false);
    assert.equal(presence.has("traits", "Astrophysicist_icon.png"), true);
    assert.ok(seen.includes("https://img.example.com/items/Phaser_Beam_Array_icon.png"));
  });

  it("trusts the committed index when nothing remote is configured", async () => {
    const presence = await buildRemoteImagePresence({ candidates });
    assert.equal(presence.mode, "index");
    assert.equal(presence.has("items", "Gone_icon.png"), true);
  });

  it("builds VueUI-compatible public URLs and resolves the base", () => {
    assert.equal(
      publicImageUrl("https://img.example.com/", "items", "Q's (ca. 2372)_icon.png"),
      "https://img.example.com/items/Q%27s%20(ca.%202372)_icon.png",
    );
    assert.equal(resolveImageBaseUrl(null, { VITE_IMAGE_BASE_URL: "https://img.x.com/" }), "https://img.x.com");
    assert.equal(resolveImageBaseUrl("https://a.com", { IMAGE_BASE_URL: "https://b.com" }), "https://a.com");
    assert.equal(resolveImageBaseUrl(null, { VITE_IMAGE_BASE_URL: "/images" }), null);
  });
});
