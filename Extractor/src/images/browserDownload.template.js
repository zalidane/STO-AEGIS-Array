/*
 * STO AEGIS Array: wiki image downloader for the browser DevTools console.
 * Generated __GENERATED_AT__ by `npm run extract:images:browser-script`.
 * __COUNT__ files.
 *
 * Use it on a https://stowiki.net tab that has already passed Cloudflare:
 *   1. Open DevTools (F12) > Console. If Chrome asks, type: allow pasting
 *   2. Paste this whole file and press Enter.
 *   3. Click "Pick images folder & start" in the panel (top right) and choose
 *      <repo>/VueUI/public/images. Allow "edit files" when Chrome asks.
 * Files go straight into items/, ships/, traits/... Files already there are
 * skipped, so you can re-paste and resume at any time.
 *
 * Fallback (no folder picker): "Save to Downloads instead" saves files named
 * <kind>__<filename>; move them with
 *   npm run images:import-downloads -- --from="%USERPROFILE%\Downloads"
 *
 * The page only ever requests same-origin stowiki.net URLs, one at a time.
 */
(() => {
  "use strict";

  const ENTRIES = __ENTRIES__;
  const GENERATED_AT = "__GENERATED_AT__";
  const REPORT_NAME = "browser-download-report.json";
  const DONE_KEY = "sto-aegis-images-done";
  const DELAY_MIN_MS = 1500;
  const DELAY_MAX_MS = 2500;
  const BACKOFF_MS = [5000, 15000, 45000];
  const CHALLENGE_MARKERS = [
    "Just a moment",
    "cf-chl",
    "challenge-platform",
    "Attention Required",
    "cf_chl_opt",
  ];

  class ChallengeError extends Error {}

  const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = () => DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
  const relPath = (entry) => `${entry.kind}/${entry.localFilename}`;

  function candidateUrls(entry, origin) {
    return [
      origin + entry.directPath,
      `${origin}/wiki/Special:FilePath/${encodeURIComponent(entry.fileName)}`,
    ];
  }

  function looksLikeChallenge(text) {
    return CHALLENGE_MARKERS.some((marker) => text.includes(marker));
  }

  function retryAfterMs(response, attempt) {
    const header = Number(response.headers.get("retry-after"));
    if (Number.isFinite(header) && header > 0) return Math.min(header, 120) * 1000;
    return BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  }

  /**
   * Fetch one image. Returns {status:"ok", blob} | {status:"missing"} |
   * {status:"failed", reason}. Throws ChallengeError on a Cloudflare page.
   */
  async function fetchImage(entry, deps) {
    const sleep = deps.sleep || defaultSleep;
    const log = deps.log || (() => {});
    let notFound = 0;
    let lastReason = "unknown";
    const urls = candidateUrls(entry, deps.origin);
    for (const url of urls) {
      for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
        let response;
        try {
          response = await deps.fetch(url, {
            credentials: "include",
            redirect: "follow",
            cache: "no-store",
          });
        } catch (error) {
          lastReason = `network: ${error && error.message ? error.message : error}`;
          if (attempt < BACKOFF_MS.length) {
            await sleep(BACKOFF_MS[attempt]);
            continue;
          }
          break;
        }
        const type = (response.headers.get("content-type") || "").toLowerCase();
        if (response.ok && type.startsWith("image/")) {
          const blob = await response.blob();
          if (blob.size > 0) return { status: "ok", blob, url: response.url || url };
          lastReason = "empty image";
          break;
        }
        if (response.status === 404 || response.status === 410) {
          notFound += 1;
          lastReason = `HTTP ${response.status}`;
          break;
        }
        const text = await response.text().catch(() => "");
        if (looksLikeChallenge(text)) {
          throw new ChallengeError(
            `Cloudflare challenge (HTTP ${response.status}) on ${url}`,
          );
        }
        if (response.ok) {
          // 200 HTML that is not a challenge: wiki page instead of a file.
          lastReason = `not an image (${type || "no content-type"})`;
          break;
        }
        lastReason = `HTTP ${response.status}`;
        if (
          [403, 429, 500, 502, 503, 504, 520, 521, 522, 524].includes(response.status) &&
          attempt < BACKOFF_MS.length
        ) {
          const wait = retryAfterMs(response, attempt);
          log(`  ${relPath(entry)}: ${lastReason}, retrying in ${Math.round(wait / 1000)}s`);
          await sleep(wait);
          continue;
        }
        break;
      }
    }
    if (notFound === urls.length) return { status: "missing" };
    return { status: "failed", reason: lastReason };
  }

  /** Sequential queue. `writer` = {has(entry), write(entry, blob)}. */
  async function runQueue(entries, writer, deps) {
    const sleep = deps.sleep || defaultSleep;
    const log = deps.log || (() => {});
    const delay = deps.delay || jitter;
    const shouldStop = deps.shouldStop || (() => false);
    const report = {
      generatedAt: GENERATED_AT,
      finishedAt: null,
      ok: [],
      skipped: [],
      missing: [],
      failed: [],
      stopped: null,
    };
    let requested = false;
    for (const [i, entry] of entries.entries()) {
      const label = `[${i + 1}/${entries.length}] ${relPath(entry)}`;
      if (shouldStop()) {
        report.stopped = "stopped by user";
        break;
      }
      if (await writer.has(entry)) {
        report.skipped.push(relPath(entry));
        continue;
      }
      if (requested) await sleep(delay());
      requested = true;
      let result;
      try {
        result = await fetchImage(entry, deps);
      } catch (error) {
        if (error instanceof ChallengeError) {
          report.stopped = error.message;
          log(`${label}: STOPPED. ${error.message}`);
          break;
        }
        result = { status: "failed", reason: String(error && error.message ? error.message : error) };
      }
      const row = { kind: entry.kind, localFilename: entry.localFilename, wikiTitle: entry.wikiTitle };
      if (result.status === "ok") {
        try {
          await writer.write(entry, result.blob);
          report.ok.push(relPath(entry));
          log(`${label}: ok (${(result.blob.size / 1024).toFixed(1)} KB)`);
        } catch (error) {
          report.failed.push({ ...row, reason: `write: ${error && error.message ? error.message : error}` });
          log(`${label}: write failed`);
        }
      } else if (result.status === "missing") {
        report.missing.push(row);
        log(`${label}: not on the wiki (404)`);
      } else {
        report.failed.push({ ...row, reason: result.reason });
        log(`${label}: failed (${result.reason})`);
      }
    }
    report.finishedAt = new Date().toISOString();
    return report;
  }

  async function directoryWriter(root) {
    const dirs = new Map();
    const dir = async (kind) => {
      if (!dirs.has(kind)) dirs.set(kind, await root.getDirectoryHandle(kind, { create: true }));
      return dirs.get(kind);
    };
    return {
      mode: "folder",
      async has(entry) {
        try {
          const handle = await (await dir(entry.kind)).getFileHandle(entry.localFilename);
          return (await handle.getFile()).size > 0;
        } catch {
          return false;
        }
      },
      async write(entry, blob) {
        const handle = await (await dir(entry.kind)).getFileHandle(entry.localFilename, { create: true });
        const stream = await handle.createWritable();
        await stream.write(blob);
        await stream.close();
      },
      async writeReport(json) {
        const handle = await root.getFileHandle(REPORT_NAME, { create: true });
        const stream = await handle.createWritable();
        await stream.write(json);
        await stream.close();
      },
    };
  }

  function downloadWriter() {
    const done = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || "[]"));
    const save = (blob, name) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    };
    return {
      mode: "downloads",
      async has(entry) {
        return done.has(relPath(entry));
      },
      async write(entry, blob) {
        save(blob, `${entry.kind}__${entry.localFilename}`);
        done.add(relPath(entry));
        localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
      },
      async writeReport(json) {
        save(new Blob([json], { type: "application/json" }), REPORT_NAME);
      },
    };
  }

  // ---- page UI (browser only) ----
  if (typeof document === "undefined" || typeof window === "undefined") {
    globalThis.__stoImagesTest = { ENTRIES, fetchImage, runQueue, candidateUrls, looksLikeChallenge, ChallengeError };
    return;
  }

  if (location.origin !== "https://stowiki.net") {
    console.warn(`[sto-images] This tab is ${location.origin}. Run the script on a https://stowiki.net tab so requests are same-origin.`);
  }

  document.getElementById("sto-aegis-images-panel")?.remove();
  const panel = document.createElement("div");
  panel.id = "sto-aegis-images-panel";
  panel.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;background:#111;color:#eee;" +
    "font:13px/1.4 system-ui,sans-serif;padding:12px;border-radius:8px;box-shadow:0 4px 16px #0008;width:340px";
  // Built with DOM/CSSOM calls (no inline HTML styles) so a strict page CSP cannot block it.
  const title = document.createElement("b");
  title.textContent = `STO AEGIS images (${ENTRIES.length} files)`;
  panel.appendChild(title);
  const button = (act, label) => {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.setAttribute("data-act", act);
    el.style.margin = "8px 6px 0 0";
    el.style.padding = "4px 8px";
    el.style.cursor = "pointer";
    panel.appendChild(el);
    return el;
  };
  panel.appendChild(document.createElement("br"));
  button("folder", "Pick images folder & start");
  button("downloads", "Save to Downloads instead");
  button("stop", "Stop");
  const status = document.createElement("div");
  status.style.marginTop = "8px";
  status.style.whiteSpace = "pre-wrap";
  status.textContent = "Choose <repo>/VueUI/public/images.";
  panel.appendChild(status);
  document.body.appendChild(panel);
  const log = (message) => {
    console.log(`[sto-images] ${message}`);
    status.textContent = message;
  };

  let running = false;
  let stopRequested = false;

  async function start(mode) {
    if (running) return log("Already running.");
    let writer;
    try {
      if (mode !== "downloads" && typeof window.showDirectoryPicker === "function") {
        const root = await window.showDirectoryPicker({ id: "sto-aegis-images", mode: "readwrite" });
        if (root.name !== "images" && !confirm(`You picked "${root.name}". The expected folder is VueUI/public/images. Continue anyway?`)) {
          return log("Cancelled.");
        }
        writer = await directoryWriter(root);
      } else {
        if (mode !== "downloads") log("Folder picker unavailable; saving to Downloads.");
        writer = downloadWriter();
      }
    } catch (error) {
      return log(`Folder not picked: ${error && error.message ? error.message : error}`);
    }
    running = true;
    stopRequested = false;
    log(`Starting (${writer.mode}). Keep this tab in the foreground.`);
    const report = await runQueue(ENTRIES, writer, {
      fetch: (url, init) => window.fetch(url, init),
      origin: location.origin,
      log,
      shouldStop: () => stopRequested,
    });
    report.mode = writer.mode;
    running = false;
    const json = JSON.stringify(report, null, 2);
    try {
      await writer.writeReport(json);
    } catch (error) {
      console.warn("[sto-images] Could not save the report file", error);
    }
    const summary =
      `Done: ${report.ok.length} downloaded, ${report.skipped.length} already present, ` +
      `${report.missing.length} not on wiki, ${report.failed.length} failed.` +
      (report.stopped ? `\nSTOPPED: ${report.stopped}\nReload this tab (pass the Cloudflare check), paste the script again, and start; finished files are skipped.` : "");
    log(summary);
    console.log("[sto-images] failures:", JSON.stringify(report.failed, null, 2));
    console.log("[sto-images] not on wiki:", JSON.stringify(report.missing, null, 2));
    return report;
  }

  panel.addEventListener("click", (event) => {
    const act = event.target && event.target.getAttribute && event.target.getAttribute("data-act");
    if (act === "folder") start("folder");
    else if (act === "downloads") start("downloads");
    else if (act === "stop") {
      stopRequested = true;
      log("Stopping after the current file...");
    }
  });

  window.stoImages = { start, stop: () => { stopRequested = true; }, entries: ENTRIES };
  console.log(`[sto-images] Ready: ${ENTRIES.length} files. Click "Pick images folder & start" in the panel (top right).`);
})();
