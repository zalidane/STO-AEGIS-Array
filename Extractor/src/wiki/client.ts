import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { isCloudflareBlock, looksLikeHtml } from "./cloudflare";
import type { WikiConfig } from "./config";
import {
  cookieHeader,
  mergeCookies,
  parseSetCookieHeaders,
  type CookieJar,
} from "./cookies";
import {
  backoffDelayMs,
  defaultSleep,
  parseRetryAfterSeconds,
  RateLimiter,
  type SleepFn,
} from "./rateLimit";

export type WikiJson = Record<string, unknown>;

export type ImageInfo = {
  title: string;
  missing: boolean;
  url: string | null;
  mime: string | null;
  size: number | null;
};

type SessionFile = {
  cookies: CookieJar;
};

type FetchFn = typeof fetch;

export class WikiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WikiClientError";
  }
}

export class WikiClient {
  private cookies: CookieJar = {};
  private readonly limiter: RateLimiter;

  constructor(
    private readonly config: WikiConfig,
    private readonly fetchImpl: FetchFn = fetch,
    private readonly sleep: SleepFn = defaultSleep,
  ) {
    this.limiter = new RateLimiter(config.minDelayMs, sleep);
  }

  async restoreSession(): Promise<void> {
    try {
      const raw = await readFile(this.config.sessionPath, "utf8");
      const parsed = JSON.parse(raw) as SessionFile;
      if (parsed?.cookies && typeof parsed.cookies === "object") {
        this.cookies = parsed.cookies;
      }
    } catch {
      this.cookies = {};
    }
  }

  async persistSession(): Promise<void> {
    await mkdir(dirname(this.config.sessionPath), { recursive: true });
    const payload: SessionFile = { cookies: this.cookies };
    await writeFile(this.config.sessionPath, JSON.stringify(payload, null, 2));
  }

  async login(): Promise<void> {
    await this.restoreSession();
    if (await this.isLoggedIn()) {
      const who = this.config.botUsername.split("@")[0] || "wiki user";
      console.log(`STOWiki: already logged in as ${who}`);
      return;
    }

    if (!this.config.botUsername || !this.config.botPassword) {
      console.warn(
        [
          "STOWiki: extracting without a bot login (Special:BotPasswords is disabled for most accounts on this wiki).",
          `User-Agent: ${this.config.userAgent}`,
          "Set STOWIKI_CONTACT in .env so staff can identify this client. If Cloudflare challenges you, ask in Discord #wiki-discussion: https://discord.com/invite/startrekonline",
        ].join("\n"),
      );
      return;
    }

    const tokenJson = await this.apiGet({
      action: "query",
      meta: "tokens",
      type: "login",
    });
    const logintoken = nestedString(tokenJson, ["query", "tokens", "logintoken"]);
    if (!logintoken) {
      throw new WikiClientError("Failed to obtain MediaWiki login token");
    }

    const loginJson = await this.apiPost({
      action: "login",
      lgname: this.config.botUsername,
      lgpassword: this.config.botPassword,
      lgtoken: logintoken,
    });

    const result = nestedString(loginJson, ["login", "result"]);
    if (result !== "Success") {
      const reason = nestedString(loginJson, ["login", "reason"]) ?? result ?? "unknown";
      throw new WikiClientError(
        `MediaWiki bot login failed (${reason}). Use Special:BotPasswords (Account@BotName), not the account password.`,
      );
    }

    await this.persistSession();
    console.log("STOWiki: bot login succeeded");
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const json = await this.apiGet({ action: "query", meta: "userinfo" });
      const id = nestedNumber(json, ["query", "userinfo", "id"]);
      return id != null && id > 0;
    } catch {
      return false;
    }
  }

  async cargoQuery(
    tables: string,
    fields: string,
    offset = 0,
    limit = 500,
  ): Promise<WikiJson> {
    return this.apiGet({
      action: "cargoquery",
      tables,
      fields,
      limit: String(limit),
      offset: String(offset),
    });
  }

  async cargoFields(table: string): Promise<string[]> {
    const json = await this.apiGet({
      action: "cargofields",
      table,
    });
    const fields = json.cargofields;
    if (!fields || typeof fields !== "object") {
      throw new WikiClientError(`Failed loading Cargo schema for ${table}`);
    }
    return Object.keys(fields as Record<string, unknown>);
  }

  async imageInfo(titles: readonly string[]): Promise<ImageInfo[]> {
    if (titles.length === 0) return [];
    const json = await this.apiGet({
      action: "query",
      titles: titles.join("|"),
      prop: "imageinfo",
      iiprop: "url|mime|size",
    });
    return parseImageInfoPages(json);
  }

  /**
   * Current wikitext for wiki pages, keyed by the requested title.
   * Follows redirects. Missing pages are omitted.
   */
  async pageWikitext(titles: readonly string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const unique = [...new Set(titles.map((title) => title.trim()).filter(Boolean))];
    const batchSize = 50;

    for (let offset = 0; offset < unique.length; offset += batchSize) {
      const batch = unique.slice(offset, offset + batchSize);
      const json = await this.apiGet({
        action: "query",
        formatversion: "2",
        redirects: "1",
        titles: batch.join("|"),
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
      });
      mergePageWikitext(json, batch, result);
    }

    return result;
  }

  async categoryFiles(
    categoryTitle: string,
    pageSize = 20,
  ): Promise<ImageInfo[]> {
    const results: ImageInfo[] = [];
    let cmcontinue: string | null = null;

    while (true) {
      const params: Record<string, string> = {
        action: "query",
        generator: "categorymembers",
        gcmtitle: categoryTitle,
        gcmtype: "file",
        gcmlimit: String(pageSize),
        prop: "imageinfo",
        iiprop: "url|mime|size",
      };
      if (cmcontinue) params.gcmcontinue = cmcontinue;

      const json = await this.apiGet(params);
      results.push(...parseImageInfoPages(json));

      const next = nestedString(json, ["continue", "gcmcontinue"]);
      if (!next) break;
      cmcontinue = next;
    }

    return results;
  }

  async downloadFile(url: string): Promise<Buffer> {
    const response = await this.request(url, { method: "GET" }, { expectJson: false });
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes;
  }

  async apiGet(params: Record<string, string>): Promise<WikiJson> {
    const url = new URL(this.config.apiUrl);
    url.search = "";
    for (const [key, value] of Object.entries({ format: "json", ...params })) {
      url.searchParams.set(key, value);
    }
    const response = await this.request(url.toString(), { method: "GET" }, { expectJson: true });
    return parseWikiJson(await response.text());
  }

  async apiPost(params: Record<string, string>): Promise<WikiJson> {
    const body = new URLSearchParams({ format: "json", ...params });
    const response = await this.request(
      this.config.apiUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: body.toString(),
      },
      { expectJson: true },
    );
    return parseWikiJson(await response.text());
  }

  private async request(
    url: string,
    init: RequestInit,
    options: { expectJson: boolean },
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      await this.limiter.wait();

      const headers = new Headers(init.headers);
      headers.set("User-Agent", this.config.userAgent);
      headers.set("Accept", options.expectJson ? "application/json,text/plain;q=0.9,*/*;q=0.8" : "*/*");
      const cookie = cookieHeader(this.cookies);
      if (cookie) headers.set("Cookie", cookie);

      const response = await this.fetchImpl(url, {
        ...init,
        headers,
        redirect: "follow",
      });

      this.ingestCookies(response);

      const contentType = response.headers.get("content-type");
      const cfMitigated = response.headers.get("cf-mitigated");
      const needsPeek =
        !response.ok ||
        Boolean(cfMitigated) ||
        (contentType ?? "").toLowerCase().includes("text/html");
      const snippet = needsPeek ? await peekBody(response) : "";

      if (
        isCloudflareBlock({
          status: response.status,
          contentType,
          bodySnippet: snippet,
          cfMitigated,
        })
      ) {
        const delay = backoffDelayMs(
          attempt,
          parseRetryAfterSeconds(response.headers.get("retry-after")),
        );
        lastError = new WikiClientError(
          `Cloudflare blocked or challenged STOWiki (HTTP ${response.status}). Waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}/${this.config.maxRetries}. Open https://stowiki.net in a browser on this machine, then retry extract.`,
        );
        console.warn(lastError.message);
        await this.sleep(delay);
        continue;
      }

      if (!response.ok) {
        lastError = new WikiClientError(`STOWiki HTTP ${response.status} for ${url}`);
        if (response.status >= 500 && attempt < this.config.maxRetries) {
          await this.sleep(backoffDelayMs(attempt, parseRetryAfterSeconds(response.headers.get("retry-after")), 5_000));
          continue;
        }
        throw lastError;
      }

      if (options.expectJson && looksLikeHtml(contentType, snippet)) {
        lastError = new WikiClientError("STOWiki returned HTML instead of JSON (likely a challenge page)");
        await this.sleep(backoffDelayMs(attempt, null));
        continue;
      }

      await this.persistSession();
      return response;
    }

    throw lastError ?? new WikiClientError("STOWiki request failed after retries");
  }

  private ingestCookies(response: Response): void {
    const setCookie =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    if (setCookie.length === 0) return;
    this.cookies = mergeCookies(this.cookies, parseSetCookieHeaders(setCookie));
  }
}

function nestedString(value: unknown, path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
}

function nestedNumber(value: unknown, path: string[]): number | null {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" ? current : null;
}

function parseWikiJson(text: string): WikiJson {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") {
      throw new WikiClientError("STOWiki JSON was not an object");
    }
    const json = parsed as WikiJson;
    if (json.error && typeof json.error === "object") {
      const err = json.error as Record<string, unknown>;
      const info = typeof err.info === "string" ? err.info : "unknown wiki error";
      throw new WikiClientError(`MediaWiki API error: ${info}`);
    }
    return json;
  } catch (error) {
    if (error instanceof WikiClientError) throw error;
    throw new WikiClientError("Failed to parse STOWiki JSON");
  }
}

function mergePageWikitext(
  json: WikiJson,
  requested: readonly string[],
  into: Map<string, string>,
) {
  const query = json.query;
  if (!query || typeof query !== "object") return;
  const q = query as Record<string, unknown>;
  const alias = new Map<string, string>();
  for (const row of listOf(q.normalized).concat(listOf(q.redirects))) {
    const from = typeof row.from === "string" ? row.from : "";
    const to = typeof row.to === "string" ? row.to : "";
    if (from && to) alias.set(from, to);
  }

  const contentByTitle = new Map<string, string>();
  for (const page of listOf(q.pages)) {
    if (page.missing != null) continue;
    const title = typeof page.title === "string" ? page.title : "";
    const text = revisionWikitext(page);
    if (title && text != null) contentByTitle.set(title, text);
  }

  for (const title of requested) {
    const canonical = resolveAlias(title, alias);
    const text =
      contentByTitle.get(canonical) ??
      contentByTitle.get(title) ??
      contentByTitle.get(title.replace(/_/g, " "));
    if (text != null) into.set(title, text);
  }
}

function resolveAlias(title: string, alias: Map<string, string>): string {
  let current = title;
  for (let i = 0; i < 8; i += 1) {
    const next = alias.get(current);
    if (!next || next === current) return current;
    current = next;
  }
  return current;
}

function revisionWikitext(page: Record<string, unknown>): string | null {
  const revisions = Array.isArray(page.revisions) ? page.revisions[0] : null;
  if (!revisions || typeof revisions !== "object") return null;
  const rev = revisions as Record<string, unknown>;
  if (typeof rev.content === "string") return rev.content;
  if (typeof rev["*"] === "string") return rev["*"];
  const slots = rev.slots;
  if (!slots || typeof slots !== "object") return null;
  const main = (slots as Record<string, unknown>).main;
  if (!main || typeof main !== "object") return null;
  const slot = main as Record<string, unknown>;
  if (typeof slot.content === "string") return slot.content;
  if (typeof slot["*"] === "string") return slot["*"];
  return null;
}

function listOf(value: unknown): Array<Record<string, unknown>> {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
      : [];
  return rows.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object",
  );
}

function parseImageInfoPages(json: WikiJson): ImageInfo[] {
  const query = json.query;
  if (!query || typeof query !== "object") return [];
  const pages = (query as Record<string, unknown>).pages;
  const list: unknown[] = Array.isArray(pages)
    ? pages
    : pages && typeof pages === "object"
      ? Object.values(pages as Record<string, unknown>)
      : [];

  const results: ImageInfo[] = [];
  for (const page of list) {
    if (!page || typeof page !== "object") continue;
    const row = page as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title : "";
    const missing = row.missing != null || (typeof row.pageid === "number" && row.pageid < 0);
    const imageinfo = Array.isArray(row.imageinfo) ? row.imageinfo[0] : null;
    const info = imageinfo && typeof imageinfo === "object" ? (imageinfo as Record<string, unknown>) : null;
    results.push({
      title,
      missing,
      url: typeof info?.url === "string" ? info.url : null,
      mime: typeof info?.mime === "string" ? info.mime : null,
      size: typeof info?.size === "number" ? info.size : null,
    });
  }
  return results;
}

async function peekBody(response: Response): Promise<string> {
  try {
    const clone = response.clone();
    const text = await clone.text();
    return text.slice(0, 2_000);
  } catch {
    return "";
  }
}
