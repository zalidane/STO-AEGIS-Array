import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyStaticHost,
  BLOCKED_CACHE_CONTROL,
  cacheHeadersForUrl,
  DOCUMENT_CACHE_CONTROL,
  DOCUMENT_CDN_CACHE_CONTROL,
  findSecretMarker,
  HASHED_ASSET_CACHE_CONTROL,
  isBlockedRequestPath,
  isSensitiveRepoPath,
  scrubStaticOutput,
  STATIC_IMAGE_CACHE_CONTROL,
  type HeaderSink,
} from "../../server/staticHostPolicy";

const repoRoot = existsSync(path.join(process.cwd(), "VueUI"))
  ? process.cwd()
  : path.resolve(process.cwd(), "..");

describe("isBlockedRequestPath", () => {
  it("blocks dotfiles, encodings, and config backups", () => {
    expect(isBlockedRequestPath("/.env")).toBe(true);
    expect(isBlockedRequestPath("/notifications/.env")).toBe(true);
    expect(isBlockedRequestPath("/.env.production")).toBe(true);
    expect(isBlockedRequestPath("/.git/HEAD")).toBe(true);
    expect(isBlockedRequestPath("/.git/config")).toBe(true);
    expect(isBlockedRequestPath("/%2eenv")).toBe(true);
    expect(isBlockedRequestPath("/notifications/%2eenv")).toBe(true);
    expect(isBlockedRequestPath("/%252eenv")).toBe(true);
    expect(isBlockedRequestPath("/foo/wp-config.php.bak")).toBe(true);
    expect(isBlockedRequestPath("/wp-login.php")).toBe(true);
    expect(isBlockedRequestPath("/xmlrpc.php")).toBe(true);
    expect(isBlockedRequestPath("/wp-admin/install.php")).toBe(true);
    expect(isBlockedRequestPath("/id_rsa")).toBe(true);
    expect(isBlockedRequestPath("/backup.sql.bak")).toBe(true);
    expect(isBlockedRequestPath("/config/app.env")).toBe(true);
    expect(isBlockedRequestPath("/.well-known/.env")).toBe(true);
  });

  it("allows the app, hashed assets, and ACME challenges", () => {
    expect(isBlockedRequestPath("/")).toBe(false);
    expect(isBlockedRequestPath("/ships")).toBe(false);
    expect(isBlockedRequestPath("/assets/index-abc123.css")).toBe(false);
    expect(isBlockedRequestPath("/placeholders/ship-placeholder.png")).toBe(false);
    expect(isBlockedRequestPath("/.well-known/acme-challenge/token")).toBe(false);
    expect(isBlockedRequestPath("/environment")).toBe(false);
    expect(isBlockedRequestPath("/env.d.ts")).toBe(false);
    expect(isSensitiveRepoPath("VueUI/env.d.ts")).toBe(false);
  });
});

describe("cacheHeadersForUrl", () => {
  it("marks hashed build assets immutable and documents revalidated", () => {
    expect(cacheHeadersForUrl("/assets/index-abc123.css")).toMatchObject({
      "Cache-Control": HASHED_ASSET_CACHE_CONTROL,
    });
    expect(cacheHeadersForUrl("/assets/materialdesignicons-webfont-abc.woff2")).toMatchObject({
      "Cache-Control": HASHED_ASSET_CACHE_CONTROL,
    });
    expect(HASHED_ASSET_CACHE_CONTROL).toContain("immutable");

    expect(cacheHeadersForUrl("/")).toMatchObject({
      "Cache-Control": DOCUMENT_CACHE_CONTROL,
      "CDN-Cache-Control": DOCUMENT_CDN_CACHE_CONTROL,
    });
    expect(cacheHeadersForUrl("/ships?tab=1")).toMatchObject({
      "Cache-Control": DOCUMENT_CACHE_CONTROL,
    });
    expect(cacheHeadersForUrl("/index.html")).toMatchObject({
      "Cache-Control": DOCUMENT_CACHE_CONTROL,
    });
    expect(DOCUMENT_CACHE_CONTROL).not.toContain("immutable");
  });

  it("caches stable images for a month without immutable", () => {
    expect(cacheHeadersForUrl("/favicon.ico")).toMatchObject({
      "Cache-Control": STATIC_IMAGE_CACHE_CONTROL,
    });
    expect(cacheHeadersForUrl("/placeholders/trait-placeholder.png")).toMatchObject({
      "Cache-Control": STATIC_IMAGE_CACHE_CONTROL,
    });
    expect(STATIC_IMAGE_CACHE_CONTROL).toBe(
      "public, max-age=2592000, stale-while-revalidate=86400",
    );
    expect(STATIC_IMAGE_CACHE_CONTROL).not.toContain("immutable");
  });

  it("does not cache blocked paths", () => {
    expect(cacheHeadersForUrl("/notifications/.env")["Cache-Control"]).toBe(
      BLOCKED_CACHE_CONTROL,
    );
  });
});

describe("applyStaticHost", () => {
  it("returns 404 for dotfiles", () => {
    const sink = fakeResponse();
    const blocked = applyStaticHost({ url: "/notifications/.env" }, sink.res);
    expect(blocked).toBe(true);
    expect(sink.res.statusCode).toBe(404);
    expect(sink.headers.get("cache-control")).toBe(BLOCKED_CACHE_CONTROL);
    expect(sink.ended).toBe("");
  });

  it("replaces sirv's no-cache bag for hashed assets", () => {
    const sink = fakeResponse();
    const blocked = applyStaticHost({ url: "/assets/index-abc.css?x=1" }, sink.res);
    expect(blocked).toBe(false);
    const bag: Record<string, string> = { "Cache-Control": "no-cache", ETag: 'W/"1"' };
    sink.res.writeHead(200, bag);
    expect(bag["Cache-Control"]).toBe(HASHED_ASSET_CACHE_CONTROL);
    expect(bag["CDN-Cache-Control"]).toBe("public, max-age=31536000");
    expect(bag.ETag).toBe('W/"1"');
  });

  it("uses the document policy when the URL is rewritten to index.html", () => {
    const sink = fakeResponse();
    const req = { url: "/ships" };
    applyStaticHost(req, sink.res);
    req.url = "/index.html";
    sink.res.end("<html></html>");
    expect(sink.headers.get("cache-control")).toBe(DOCUMENT_CACHE_CONTROL);
    expect(sink.headers.get("cdn-cache-control")).toBe(DOCUMENT_CDN_CACHE_CONTROL);
  });
});

describe("scrubStaticOutput", () => {
  it("removes dotfiles, secret names, and symlinks from a build directory", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aegis-dist-"));
    mkdirSync(path.join(root, "assets"));
    writeFileSync(path.join(root, "index.html"), "<html></html>");
    writeFileSync(path.join(root, "assets", "app-abc.js"), "console.log(1)");
    writeFileSync(path.join(root, ".env"), "R2_SECRET_ACCESS_KEY=placeholder\n");
    mkdirSync(path.join(root, ".git"));
    writeFileSync(path.join(root, ".git", "config"), "[core]\n");
    writeFileSync(path.join(root, "wp-config.php"), "<?php\n");
    symlinkSync(path.join(root, "index.html"), path.join(root, "link.html"));

    const result = scrubStaticOutput(root);
    expect(result.removed.sort()).toEqual([".env", ".git", "link.html", "wp-config.php"]);
    expect(scrubStaticOutput(root).removed).toEqual([]);
  });

  it("fails the build when a text file contains a private key marker", () => {
    const root = mkdtempSync(path.join(tmpdir(), "aegis-dist-secret-"));
    const header = ["-----BEGIN ", "PRIVATE KEY-----"].join("");
    writeFileSync(path.join(root, "notes.txt"), `${header}\nabc\n`);
    expect(() => scrubStaticOutput(root)).toThrow(/notes\.txt \(private-key\)/);
  });
});

describe("findSecretMarker", () => {
  it("ignores the example database URL and empty assignments", () => {
    expect(
      findSecretMarker('DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sto_aegis"'),
    ).toBeNull();
    expect(findSecretMarker("R2_SECRET_ACCESS_KEY=\n")).toBeNull();
    expect(findSecretMarker("R2_SECRET_ACCESS_KEY=<secret>\n")).toBeNull();
  });

  it("names the marker without echoing the value", () => {
    const value = "super-secret-value";
    const name = ["R2_SECRET", "ACCESS_KEY"].join("_");
    const marker = findSecretMarker(`${name}=${value}\n`);
    expect(marker).toBe("assigned-secret");
    expect(marker).not.toContain(value);
  });
});

describe("repository secrets", () => {
  it("keeps env files and key material out of git", () => {
    expect(isIgnored(".env")).toBe(true);
    expect(isIgnored(".env.production")).toBe(true);
    expect(isIgnored("VueUI/.env.local")).toBe(true);
    expect(isIgnored("id_rsa")).toBe(true);
    expect(isIgnored("credentials.json")).toBe(true);
    expect(isIgnored("server.bak")).toBe(true);
    expect(isIgnored(".env.example")).toBe(false);

    const tracked = git(["ls-files", "-z"])
      .split("\0")
      .filter((file) => file.length > 0);
    const sensitive = tracked.filter((file) => isSensitiveRepoPath(file));
    expect(sensitive).toEqual([]);
  });

  it("does not find secret markers in tracked text", () => {
    const tracked = git(["ls-files", "-z"])
      .split("\0")
      .filter((file) => file.length > 0 && isTextPath(file));
    const hits: string[] = [];
    for (const file of tracked) {
      const text = readFileSync(path.join(repoRoot, file), "utf8");
      const marker = findSecretMarker(text);
      if (marker) hits.push(`${file} (${marker})`);
    }
    expect(hits).toEqual([]);
  });
});

function isTextPath(file: string): boolean {
  const ext = path.extname(file).slice(1).toLowerCase();
  return [
    "html",
    "js",
    "mjs",
    "cjs",
    "ts",
    "vue",
    "css",
    "json",
    "md",
    "txt",
    "svg",
    "yml",
    "yaml",
    "toml",
    "example",
  ].includes(ext) || path.basename(file).startsWith(".env");
}

function isIgnored(file: string): boolean {
  try {
    git(["check-ignore", "-q", "--", file]);
    return true;
  } catch {
    return false;
  }
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function fakeResponse(): {
  res: HeaderSink & { url?: string };
  headers: Map<string, string>;
  ended: string;
} {
  const headers = new Map<string, string>();
  let ended = "";
  const res: HeaderSink = {
    statusCode: 200,
    headersSent: false,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    writeHead(status: number) {
      this.statusCode = status;
      this.headersSent = true;
      return this;
    },
    end(chunk?: unknown) {
      ended = typeof chunk === "string" ? chunk : "";
      this.headersSent = true;
      return this;
    },
  };
  return {
    res,
    headers,
    get ended() {
      return ended;
    },
  };
}
