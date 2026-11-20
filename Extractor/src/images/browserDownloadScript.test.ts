import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

import {
  browserDownloadEntries,
  buildBrowserDownloadScript,
  wikiFileName,
  wikiUploadPath,
} from "./browserDownloadScript.js";
import { planDownloadMoves } from "./browserDownloadImport.js";

type Api = {
  ENTRIES: Array<{ kind: string; localFilename: string; directPath: string; fileName: string }>;
  runQueue: (entries: unknown[], writer: unknown, deps: unknown) => Promise<Report>;
  candidateUrls: (entry: unknown, origin: string) => string[];
};
type Report = {
  ok: string[];
  skipped: string[];
  missing: Array<{ wikiTitle: string }>;
  failed: Array<{ reason: string }>;
  stopped: string | null;
};

const targets = [
  { kind: "items", localFilename: "Temporal_Disruptor_Beam_Array_icon.png", wikiTitle: "File:Temporal Disruptor Beam Array icon.png" },
  { kind: "items", localFilename: "Qs_Ornament_Avalanche_icon.png", wikiTitle: "File:Q's Ornament: Avalanche! icon.png" },
  { kind: "ships", localFilename: "Fed_Ship_Curry.png", wikiTitle: "File:Fed Ship Curry.png" },
] as const;

async function loadApi(): Promise<Api> {
  const script = await buildBrowserDownloadScript(browserDownloadEntries(targets), new Date("2026-11-20T00:00:00Z"));
  const context: Record<string, unknown> = { console, setTimeout, Blob };
  context.globalThis = context;
  runInNewContext(script, context);
  return context.__stoImagesTest as Api;
}

function response(status: number, type: string, body: string, url = ""): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? type : null) },
    blob: async () => new Blob([body], { type }),
    text: async () => body,
  } as unknown as Response;
}

function memoryWriter(present: string[] = []) {
  const files = new Map<string, number>(present.map((key) => [key, 1]));
  return {
    files,
    has: async (e: { kind: string; localFilename: string }) => files.has(`${e.kind}/${e.localFilename}`),
    write: async (e: { kind: string; localFilename: string }, blob: Blob) => {
      files.set(`${e.kind}/${e.localFilename}`, blob.size);
    },
  };
}

const quick = { origin: "https://stowiki.net", sleep: async () => {}, delay: () => 0, log: () => {} };

describe("browser download script", () => {
  it("computes MediaWiki hashed upload paths", () => {
    assert.equal(wikiFileName("File:temporal Disruptor Beam Array icon.png"), "Temporal_Disruptor_Beam_Array_icon.png");
    // Matches imageinfo: /e/e1/Temporal_Disruptor_Beam_Array_icon.png
    assert.equal(
      wikiUploadPath("Temporal_Disruptor_Beam_Array_icon.png"),
      "/w/images/Wiki_Images/sto_images/e/e1/Temporal_Disruptor_Beam_Array_icon.png",
    );
    assert.match(wikiUploadPath("Q's_Ornament:_Avalanche!_icon.png"), /\/Q's_Ornament%3A_Avalanche!_icon\.png$/);
  });

  it("embeds the entries and only same-origin URLs", async () => {
    const api = await loadApi();
    assert.equal(api.ENTRIES.length, 3);
    const urls = api.candidateUrls(api.ENTRIES[0], "https://stowiki.net");
    assert.deepEqual([...urls], [
      "https://stowiki.net/w/images/Wiki_Images/sto_images/e/e1/Temporal_Disruptor_Beam_Array_icon.png",
      "https://stowiki.net/wiki/Special:FilePath/Temporal_Disruptor_Beam_Array_icon.png",
    ]);
  });

  it("downloads, skips present files, falls back to Special:FilePath, and records 404s", async () => {
    const api = await loadApi();
    const writer = memoryWriter(["ships/Fed_Ship_Curry.png"]);
    const calls: string[] = [];
    const report = await api.runQueue(api.ENTRIES, writer, {
      ...quick,
      fetch: async (url: string) => {
        calls.push(url);
        if (url.includes("Temporal")) return response(200, "image/png", "png-bytes");
        return response(404, "text/html", "<html>Not Found</html>");
      },
    });
    assert.deepEqual([...report.ok], ["items/Temporal_Disruptor_Beam_Array_icon.png"]);
    assert.deepEqual([...report.skipped], ["ships/Fed_Ship_Curry.png"]);
    assert.equal(report.missing.length, 1);
    assert.equal(report.missing[0]!.wikiTitle, "File:Q's Ornament: Avalanche! icon.png");
    assert.equal(calls.filter((u) => u.includes("Ornament")).length, 2);
    assert.ok(!calls.some((u) => u.includes("Curry")));
  });

  it("retries 429 with backoff, then succeeds", async () => {
    const api = await loadApi();
    let n = 0;
    const waits: number[] = [];
    const report = await api.runQueue([api.ENTRIES[0]], memoryWriter(), {
      ...quick,
      sleep: async (ms: number) => {
        waits.push(ms);
      },
      fetch: async () => (++n < 3 ? response(429, "text/plain", "slow down") : response(200, "image/png", "x")),
    });
    assert.equal(report.ok.length, 1);
    assert.deepEqual(waits, [5000, 15000]);
  });

  it("stops on a Cloudflare challenge page instead of hammering", async () => {
    const api = await loadApi();
    let n = 0;
    const report = await api.runQueue(api.ENTRIES, memoryWriter(), {
      ...quick,
      fetch: async () => {
        n += 1;
        return response(403, "text/html", "<title>Just a moment...</title>");
      },
    });
    assert.equal(n, 1);
    assert.match(report.stopped ?? "", /Cloudflare challenge/);
    assert.equal(report.ok.length, 0);
  });

  it("treats a 200 HTML page as not-an-image and tries the next URL", async () => {
    const api = await loadApi();
    const report = await api.runQueue([api.ENTRIES[0]], memoryWriter(), {
      ...quick,
      fetch: async (url: string) =>
        url.includes("Special:FilePath") ? response(200, "image/png", "x") : response(200, "text/html", "<html>wiki page</html>"),
    });
    assert.equal(report.ok.length, 1);
  });
});

describe("planDownloadMoves", () => {
  it("maps kind__file names, prefers un-suffixed copies, and keeps existing files", () => {
    const plan = planDownloadMoves(
      [
        "items__A_icon.png",
        "items__A_icon (1).png",
        "items__B_icon (2).png",
        "ships__Fed_Ship_Curry.png",
        "random.png",
        "bogus__x.png",
        "browser-download-report.json",
        "browser-download-report (1).json",
      ],
      new Set(["ships/Fed_Ship_Curry.png"]),
    );
    assert.deepEqual(plan.moves, [
      { source: "items__A_icon.png", kind: "items", filename: "A_icon.png" },
      { source: "items__B_icon (2).png", kind: "items", filename: "B_icon.png" },
    ]);
    assert.deepEqual(plan.alreadyPresent, ["ships/Fed_Ship_Curry.png"]);
    assert.equal(plan.report, "browser-download-report (1).json");
  });
});
