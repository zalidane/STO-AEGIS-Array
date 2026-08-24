import { resolve } from "node:path";
import { DEFAULT_MIN_DELAY_MS } from "./rateLimit";

const DEFAULT_API_URL = "https://stowiki.net/w/api.php";
const DEFAULT_PROJECT_URL = "https://github.com/zalidane/STO-AEGIS-Array";
const DEFAULT_MAX_RETRIES = 8;

export type WikiConfig = {
  apiUrl: string;
  userAgent: string;
  botUsername: string;
  botPassword: string;
  minDelayMs: number;
  maxRetries: number;
  sessionPath: string;
};

export class WikiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WikiConfigError";
  }
}

export function loadWikiConfig(
  env: NodeJS.ProcessEnv = process.env,
  outputDir: string = "output",
): WikiConfig {
  const botUsername = env.STOWIKI_BOT_USERNAME?.trim() ?? "";
  const botPassword = env.STOWIKI_BOT_PASSWORD?.trim() ?? "";
  const contact = env.STOWIKI_CONTACT?.trim() || botUsername.split("@")[0] || "unauthenticated";
  const projectUrl = env.STOWIKI_PROJECT_URL?.trim() || DEFAULT_PROJECT_URL;
  const userAgent =
    env.STOWIKI_USER_AGENT?.trim() ||
    `STO-AEGIS-Array/1.0 (${projectUrl}; ${contact})`;

  const minDelayMs = parsePositiveInt(env.STOWIKI_MIN_DELAY_MS, DEFAULT_MIN_DELAY_MS);
  const maxRetries = parsePositiveInt(env.STOWIKI_MAX_RETRIES, DEFAULT_MAX_RETRIES);

  return {
    apiUrl: env.STOWIKI_API_URL?.trim() || DEFAULT_API_URL,
    userAgent,
    botUsername,
    botPassword,
    minDelayMs,
    maxRetries,
    sessionPath: resolve(outputDir, ".wiki-session.json"),
  };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
