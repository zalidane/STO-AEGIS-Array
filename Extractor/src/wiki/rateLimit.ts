export const DEFAULT_MIN_DELAY_MS = 2_500;
export const DEFAULT_MAX_BACKOFF_MS = 15 * 60_000;
export const DEFAULT_BASE_BACKOFF_MS = 60_000;

export function backoffDelayMs(
  attempt: number,
  retryAfterSec?: number | null,
  baseMs: number = DEFAULT_BASE_BACKOFF_MS,
  maxMs: number = DEFAULT_MAX_BACKOFF_MS,
): number {
  if (retryAfterSec != null && retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1_000, maxMs);
  }
  const delay = baseMs * 2 ** Math.max(0, attempt);
  return Math.min(delay, maxMs);
}

export function parseRetryAfterSeconds(header: string | null | undefined): number | null {
  if (!header) return null;
  const asNumber = Number.parseInt(header, 10);
  if (!Number.isNaN(asNumber) && asNumber >= 0) return asNumber;
  const asDate = Date.parse(header);
  if (Number.isNaN(asDate)) return null;
  const seconds = Math.ceil((asDate - Date.now()) / 1_000);
  return seconds > 0 ? seconds : 0;
}

export type SleepFn = (ms: number) => Promise<void>;

export const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class RateLimiter {
  private lastAt = 0;

  constructor(
    private readonly minDelayMs: number,
    private readonly sleep: SleepFn = defaultSleep,
    private readonly now: () => number = Date.now,
  ) {}

  async wait(): Promise<void> {
    const now = this.now();
    const wait = this.lastAt + this.minDelayMs - now;
    if (wait > 0) await this.sleep(wait);
    this.lastAt = this.now();
  }
}
