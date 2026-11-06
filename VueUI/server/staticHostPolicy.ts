import { lstatSync, readdirSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import path from "node:path";

/**
 * Hashed Vite files under `/assets/` (JS, CSS, and the Material Design font).
 * The filename changes when the bytes change, so browsers can keep them.
 */
export const HASHED_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

/** Edge TTL for hashed assets. `immutable` is a browser directive. */
export const HASHED_ASSET_CDN_CACHE_CONTROL = "public, max-age=31536000";

/**
 * SPA shell and other documents. Revalidate so a deploy's new asset hashes
 * are picked up. Pair with Cloudflare "Respect Existing Headers", or the Free
 * plan's 4 hour browser TTL will raise this.
 */
export const DOCUMENT_CACHE_CONTROL = "public, max-age=0, must-revalidate";

export const DOCUMENT_CDN_CACHE_CONTROL = "no-store";

/**
 * Stable image names (favicons, placeholders, and the R2 sync).
 * Not `immutable`: the same key can be replaced by a later extract.
 * Keep this aligned with `IMAGE_CACHE_CONTROL` in Extractor.
 */
export const STATIC_IMAGE_CACHE_CONTROL =
  "public, max-age=2592000, stale-while-revalidate=86400";

export const BLOCKED_CACHE_CONTROL = "no-store";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "jfif",
  "gif",
  "webp",
  "avif",
  "svg",
  "ico",
]);

const SECRET_EXTENSIONS = new Set([
  "bak",
  "old",
  "orig",
  "save",
  "swp",
  "swo",
  "pem",
  "key",
  "p12",
  "pfx",
  "cer",
  "der",
]);

const SECRET_BASENAMES = new Set([
  "wp-config.php",
  "wp-login.php",
  "xmlrpc.php",
  "web.config",
  "credentials.json",
  "secrets.json",
  "id_rsa",
  "id_rsa.pub",
  "id_dsa",
  "id_dsa.pub",
  "id_ed25519",
  "id_ed25519.pub",
  "phpinfo.php",
]);

const TEXT_OUTPUT_EXTENSIONS = new Set([
  "html",
  "js",
  "mjs",
  "cjs",
  "css",
  "json",
  "txt",
  "svg",
  "map",
  "webmanifest",
  "xml",
]);

const PRIVATE_KEY = /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----/;
const AWS_ACCESS_KEY_ID = /\bAKIA[0-9A-Z]{16}\b/;
const SECRET_ASSIGNMENT =
  /^(?:R2_SECRET_ACCESS_KEY|R2_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|STOWIKI_BOT_PASSWORD)\s*=\s*(.*)$/gim;
const DATABASE_URL_ASSIGNMENT =
  /DATABASE_URL\s*=\s*['"]?postgres(?:ql)?:\/\/([^:'"/\s]+):([^@'"\s]+)@/gi;

const PLACEHOLDER_PASSWORDS = new Set([
  "password",
  "secret",
  "changeme",
  "postgres",
  "example",
  "todo",
]);

export type HeaderSink = {
  statusCode: number;
  headersSent: boolean;
  setHeader(name: string, value: string | number | readonly string[]): void;
  writeHead(statusCode: number, ...rest: unknown[]): unknown;
  end(chunk?: unknown, ...rest: unknown[]): unknown;
};

export type HeaderMap = Record<string, string>;

export function pathnameFromUrl(url: string | undefined): string {
  const raw = url && url.length > 0 ? url : "/";
  const stop = raw.search(/[?#]/);
  const pathOnly = stop === -1 ? raw : raw.slice(0, stop);
  if (!pathOnly.startsWith("/")) return `/${pathOnly}`;
  return pathOnly;
}

/**
 * True when this URL must never be served, including SPA fallback.
 * Dot segments are blocked except `.well-known` (ACME). Decoding is repeated
 * so `%2eenv` and `%252eenv` do not slip through.
 */
export function isBlockedRequestPath(url: string | undefined): boolean {
  const pathOnly = pathnameFromUrl(url);
  if (pathOnly.includes("\\") || pathOnly.includes("\0")) return true;
  const decoded = decodePath(pathOnly);
  if (decoded == null) return true;
  if (decoded.includes("\\") || decoded.includes("\0")) return true;

  const segments = decoded.split("/").filter((segment) => segment.length > 0);
  for (const segment of segments) {
    if (segment === "." || segment === "..") return true;
    if (segment.startsWith(".")) {
      if (segment.toLowerCase() === ".well-known") continue;
      return true;
    }
    if (isSecretBasename(segment)) return true;
  }
  return false;
}

/**
 * Tracked paths that must not be in git. Ordinary dot directories such as
 * `.github` are allowed. `.env.example` is the only env file we commit.
 */
export function isSensitiveRepoPath(relativePath: string): boolean {
  const normalized = relativePath.split("\\").join("/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (base === ".env.example") return false;
  const lower = base.toLowerCase();
  if (lower === ".env" || lower.startsWith(".env.")) return true;
  return isSecretBasename(base);
}

export function cacheHeadersForUrl(url: string | undefined): HeaderMap {
  if (isBlockedRequestPath(url)) {
    return {
      "Cache-Control": BLOCKED_CACHE_CONTROL,
      "CDN-Cache-Control": BLOCKED_CACHE_CONTROL,
    };
  }

  const decoded = decodePath(pathnameFromUrl(url)) ?? pathnameFromUrl(url);
  const lower = decoded.toLowerCase();
  if (lower.startsWith("/assets/")) {
    return {
      "Cache-Control": HASHED_ASSET_CACHE_CONTROL,
      "CDN-Cache-Control": HASHED_ASSET_CDN_CACHE_CONTROL,
    };
  }
  if (IMAGE_EXTENSIONS.has(extensionOf(lower))) {
    return {
      "Cache-Control": STATIC_IMAGE_CACHE_CONTROL,
      "CDN-Cache-Control": STATIC_IMAGE_CACHE_CONTROL,
    };
  }
  return {
    "Cache-Control": DOCUMENT_CACHE_CONTROL,
    "CDN-Cache-Control": DOCUMENT_CDN_CACHE_CONTROL,
  };
}

/**
 * Names a high-confidence secret in text, or null. The return value is a
 * marker id, never a slice of the file.
 */
export function findSecretMarker(text: string): string | null {
  if (PRIVATE_KEY.test(text)) return "private-key";
  if (AWS_ACCESS_KEY_ID.test(text)) return "aws-access-key";
  if (hasAssignedSecret(text)) return "assigned-secret";
  if (hasLiveDatabaseUrl(text)) return "database-url";
  return null;
}

/**
 * Install cache headers at the moment the response is sent, after Vite's
 * preview server has rewritten SPA routes to `/index.html`. Secret and
 * dotfile requests end here with 404 so they never fall through to the shell.
 * Returns true when the request was rejected.
 */
export function applyStaticHost(req: { url?: string }, res: HeaderSink): boolean {
  const blocked = isBlockedRequestPath(req.url);
  const originalWriteHead = res.writeHead.bind(res);
  const originalEnd = res.end.bind(res);
  let applied = false;

  const apply = () => {
    if (applied || res.headersSent) return;
    applied = true;
    const headers = cacheHeadersForUrl(req.url);
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
  };

  res.writeHead = ((status: number, ...rest: unknown[]) => {
    const headers = cacheHeadersForUrl(req.url);
    overrideHeaderBag([status, ...rest], headers);
    apply();
    return originalWriteHead(status, ...rest);
  }) as HeaderSink["writeHead"];

  res.end = ((...args: unknown[]) => {
    apply();
    return originalEnd(...args);
  }) as HeaderSink["end"];

  if (!blocked) return false;

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end("");
  return true;
}

export type ScrubResult = {
  removed: string[];
};

/**
 * Delete dotfiles, secret names, and symlinks from a built `dist`.
 * Throws if a remaining text file contains a secret marker. The error names
 * the path and the marker id only.
 */
export function scrubStaticOutput(rootDir: string): ScrubResult {
  const removed: string[] = [];
  if (!existsDir(rootDir)) return { removed };

  removeBlockedEntries(rootDir, "", removed);

  const findings: string[] = [];
  scanTextFiles(rootDir, "", findings);
  if (findings.length > 0) {
    throw new Error(
      `Build output contains secret markers: ${findings.join(", ")}`,
    );
  }
  return { removed };
}

function decodePath(pathOnly: string): string | null {
  let current = pathOnly;
  for (let i = 0; i < 3; i += 1) {
    if (!current.includes("%")) return current;
    try {
      const next = decodeURIComponent(current);
      if (next === current) return current;
      current = next;
    } catch {
      return null;
    }
  }
  return current;
}

function isSecretBasename(segment: string): boolean {
  const lower = segment.toLowerCase();
  if (SECRET_BASENAMES.has(lower)) return true;
  if (lower.endsWith("~")) return true;
  if (lower === "wp-admin" || lower.startsWith("wp-config")) return true;
  if (/^(?:id_rsa|id_dsa|id_ed25519)(?:\.|$)/.test(lower)) return true;
  // `file.env` and `app.env.bak`. `env.d.ts` is a Vite type declaration.
  if (/\.env(?:\.|$)/i.test(segment)) return true;
  const ext = extensionOf(lower);
  return SECRET_EXTENSIONS.has(ext);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1);
}

function hasAssignedSecret(text: string): boolean {
  SECRET_ASSIGNMENT.lastIndex = 0;
  for (const match of text.matchAll(SECRET_ASSIGNMENT)) {
    if (assignmentIsReal(match[1] ?? "")) return true;
  }
  return false;
}

function hasLiveDatabaseUrl(text: string): boolean {
  DATABASE_URL_ASSIGNMENT.lastIndex = 0;
  for (const match of text.matchAll(DATABASE_URL_ASSIGNMENT)) {
    const user = (match[1] ?? "").toLowerCase();
    const password = (match[2] ?? "").toLowerCase();
    if (!password || PLACEHOLDER_PASSWORDS.has(password)) continue;
    if ((user === "user" || user === "username") && password === "password") {
      continue;
    }
    return true;
  }
  return false;
}

function assignmentIsReal(raw: string): boolean {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) return false;
  if (PLACEHOLDER_PASSWORDS.has(trimmed.toLowerCase())) return false;
  return true;
}

function overrideHeaderBag(args: unknown[], headers: HeaderMap): void {
  const bag = headerBag(args);
  if (!bag) return;
  for (const name of Object.keys(headers)) {
    delete bag[name];
    delete bag[name.toLowerCase()];
  }
  Object.assign(bag, headers);
}

function headerBag(args: unknown[]): Record<string, string> | null {
  const third = args[2];
  if (isHeaderRecord(third)) return third;
  const second = args[1];
  if (isHeaderRecord(second)) return second;
  return null;
}

function isHeaderRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function existsDir(dir: string): boolean {
  try {
    return lstatSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function removeBlockedEntries(dir: string, relative: string, removed: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      unlinkSync(absolute);
      removed.push(relPath);
      continue;
    }
    if (isBlockedRequestPath(`/${relPath}`)) {
      rmSync(absolute, { recursive: true, force: true });
      removed.push(relPath);
      continue;
    }
    if (entry.isDirectory()) removeBlockedEntries(absolute, relPath, removed);
  }
}

function scanTextFiles(dir: string, relative: string, findings: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const relPath = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanTextFiles(absolute, relPath, findings);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!TEXT_OUTPUT_EXTENSIONS.has(extensionOf(entry.name.toLowerCase()))) continue;
    const text = readFileSync(absolute, "utf8");
    const marker = findSecretMarker(text);
    if (marker) findings.push(`${relPath} (${marker})`);
  }
}
