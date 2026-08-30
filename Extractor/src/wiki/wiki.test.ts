import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCloudflareBlock, looksLikeHtml } from "./cloudflare";
import { cookieHeader, mergeCookies, parseSetCookieHeaders } from "./cookies";
import { iconFileTitle, localFilename, matchKey, normalizeWikiFileTitle } from "./filenames";
import { applyImageIndexToInfoboxes, catalogImageTargets } from "./imageTargets";
import { decideImageFetch } from "./imageSync";
import { loadWikiConfig } from "./config";
import { backoffDelayMs, parseRetryAfterSeconds } from "./rateLimit";

describe("normalizeWikiFileTitle", () => {
  it("strips File: prefix noise and invisible marks", () => {
    assert.equal(
      normalizeWikiFileTitle("File:Federation_Advanced_Heavy_Cruiser.png\u200e"),
      "File:Federation Advanced Heavy Cruiser.png",
    );
  });

  it("decodes HTML entities in item names", () => {
    assert.equal(
      iconFileTitle("&quot;Improvise&quot;"),
      'File:"Improvise" icon.png',
    );
  });

  it("does not double-append icon when already present", () => {
    assert.equal(
      iconFileTitle("Adaptive Defense (space) icon.png"),
      "File:Adaptive Defense (space) icon.png",
    );
  });

  it("builds trait icon titles from icon name stems", () => {
    assert.equal(
      iconFileTitle("Adaptive Defense (space)"),
      "File:Adaptive Defense (space) icon.png",
    );
  });

  it("uses underscores for local filenames", () => {
    assert.equal(
      localFilename("File:Phaser Beam Array icon.png"),
      "Phaser_Beam_Array_icon.png",
    );
    assert.equal(
      matchKey("File:Phaser_Beam_Array_icon.png"),
      "phaser_beam_array_icon.png",
    );
  });

  it("decodes HTML apostrophes and strips them from public filenames", () => {
    assert.equal(
      localFilename("File:Amarie Smuggler&#039;s Heavy Escort.jpg"),
      "Amarie_Smugglers_Heavy_Escort.jpg",
    );
    assert.equal(
      localFilename("File:Rom Ship T'liss Temporal.png"),
      "Rom_Ship_Tliss_Temporal.png",
    );
    assert.equal(
      localFilename("File:obeliskcarrier.jpg"),
      "obeliskcarrier.jpg",
    );
  });
});

describe("catalogImageTargets", () => {
  it("collects ship files and item/trait icons without duplicates", () => {
    const targets = catalogImageTargets({
      ships: [
        { image: "File:Fed Ship Achilles.png", image2: "ExcelsiorPreRefitOverview.jpg" },
        { image: "File:Fed Ship Achilles.png", image2: null },
      ],
      traits: [{ name: "A Good Day to Die", "icon name": null }],
      starshipTraits: [{ name: "1.21 Terrawatts", "icon name": "1.21 Terrawatts" }],
      infoboxes: [{ name: "Phaser Beam Array" }],
    });

    const titles = targets.map((row) => `${row.kind}:${row.wikiTitle}`).sort();
    assert.deepEqual(titles, [
      "items:File:Phaser Beam Array icon.png",
      "ships:File:ExcelsiorPreRefitOverview.jpg",
      "ships:File:Fed Ship Achilles.png",
      "starship-traits:File:1.21 Terrawatts icon.png",
      "traits:File:A Good Day to Die icon.png",
    ]);
  });
});

describe("applyImageIndexToInfoboxes", () => {
  it("stores the local filename on items that downloaded and leaves misses null", () => {
    const stamped = applyImageIndexToInfoboxes(
      [{ name: "Phaser Beam Array" }, { name: "Missing Gizmo" }],
      [
        {
          kind: "items",
          wikiTitle: "File:Phaser Beam Array icon.png",
          localFilename: "Phaser_Beam_Array_icon.png",
          status: "downloaded",
        },
        {
          kind: "items",
          wikiTitle: "File:Missing Gizmo icon.png",
          localFilename: "Missing_Gizmo_icon.png",
          status: "missing",
        },
      ],
    );
    assert.equal(stamped[0]?.image, "Phaser_Beam_Array_icon.png");
    assert.equal(stamped[1]?.image, null);
  });
});

describe("decideImageFetch", () => {
  it("skips files already on disk and titles already known missing", () => {
    assert.equal(
      decideImageFetch({ force: false, localBytes: 12_345, priorStatus: "downloaded" }),
      "skip-local",
    );
    assert.equal(
      decideImageFetch({ force: false, localBytes: null, priorStatus: "missing" }),
      "skip-known-missing",
    );
    assert.equal(
      decideImageFetch({ force: false, localBytes: null, priorStatus: "skipped" }),
      "skip-known-missing",
    );
  });

  it("fetches new, failed, or deleted files, and everything when forced", () => {
    assert.equal(
      decideImageFetch({ force: false, localBytes: null, priorStatus: null }),
      "fetch",
    );
    assert.equal(
      decideImageFetch({ force: false, localBytes: null, priorStatus: "failed" }),
      "fetch",
    );
    assert.equal(
      decideImageFetch({ force: false, localBytes: null, priorStatus: "exists" }),
      "fetch",
    );
    assert.equal(
      decideImageFetch({ force: true, localBytes: 12_345, priorStatus: "exists" }),
      "fetch",
    );
  });
});

describe("cloudflare detection", () => {
  it("treats challenge HTML and cf-mitigated as a block", () => {
    assert.equal(
      isCloudflareBlock({
        status: 403,
        contentType: "text/html",
        bodySnippet: "<title>Just a moment...</title>",
      }),
      true,
    );
    assert.equal(
      isCloudflareBlock({
        status: 200,
        contentType: "text/html",
        bodySnippet: "challenge-platform",
        cfMitigated: "challenge",
      }),
      true,
    );
    assert.equal(
      isCloudflareBlock({
        status: 200,
        contentType: "application/json",
        bodySnippet: '{"cargoquery":[]}',
      }),
      false,
    );
  });

  it("detects HTML payloads", () => {
    assert.equal(looksLikeHtml("text/html; charset=utf-8", ""), true);
    assert.equal(looksLikeHtml("application/json", '{"ok":true}'), false);
    assert.equal(looksLikeHtml(null, "<!DOCTYPE html>"), true);
  });
});

describe("cookies and backoff", () => {
  it("parses Set-Cookie names for the request header", () => {
    const jar = parseSetCookieHeaders([
      "wikiSession=abc; Path=/; HttpOnly",
      "cf_clearance=xyz; Secure",
    ]);
    assert.deepEqual(jar, { wikiSession: "abc", cf_clearance: "xyz" });
    assert.equal(
      cookieHeader(mergeCookies(jar, { wikiSession: "def" })),
      "wikiSession=def; cf_clearance=xyz",
    );
  });

  it("honors Retry-After and caps exponential backoff", () => {
    assert.equal(parseRetryAfterSeconds("12"), 12);
    assert.equal(backoffDelayMs(0, 30), 30_000);
    assert.equal(backoffDelayMs(0, null, 60_000, 15 * 60_000), 60_000);
    assert.equal(backoffDelayMs(8, null, 60_000, 15 * 60_000), 15 * 60_000);
  });
});

describe("wiki config", () => {
  it("builds an identifying User-Agent without requiring bot credentials", () => {
    const anonymous = loadWikiConfig(
      { STOWIKI_CONTACT: "https://github.com/zalidane/STO-AEGIS-Array/issues" },
      "output",
    );
    assert.equal(anonymous.botUsername, "");
    assert.match(anonymous.userAgent, /STO-AEGIS-Array\/1\.0/);
    assert.match(anonymous.userAgent, /zalidane\/STO-AEGIS-Array/);

    const cfg = loadWikiConfig(
      {
        STOWIKI_BOT_USERNAME: "Editor@AegisBot",
        STOWIKI_BOT_PASSWORD: "secret",
        STOWIKI_CONTACT: "https://github.com/zalidane/STO-AEGIS-Array/issues",
      },
      "output",
    );
    assert.equal(cfg.botUsername, "Editor@AegisBot");
    assert.equal(cfg.minDelayMs, 2_500);
  });
});
