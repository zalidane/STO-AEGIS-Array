/**
 * Dependency-free import progress for Windows cmd/PowerShell and CI logs.
 *
 * In a TTY, the line is rewritten in place with \r (no ANSI clear/color).
 * Otherwise a plain status line is printed about every 10%, plus a heartbeat
 * so a stall is still visible when no rows advance.
 *
 * The interval redraw keeps elapsed time ticking even when work is blocked
 * (for example a database lock). Always call stop() in a finally block so
 * the timer is cleared and the process can exit.
 */

export const DEFAULT_BAR_WIDTH = 20;
export const DEFAULT_INTERVAL_MS = 250;
export const DEFAULT_THROTTLE_MS = 80;
export const DEFAULT_PLAIN_STEP = 10;
export const DEFAULT_HEARTBEAT_MS = 15_000;
export const SPINNER_FRAMES = ["|", "/", "-", "\\"] as const;

export type ProgressStream = {
  write(chunk: string): unknown;
  isTTY?: boolean;
};

export type ImportProgressOptions = {
  label: string;
  total?: number;
  indeterminate?: boolean;
  stream?: ProgressStream;
  isTTY?: boolean;
  now?: () => number;
  intervalMs?: number;
  throttleMs?: number;
  plainStep?: number;
  heartbeatMs?: number;
  barWidth?: number;
  setIntervalFn?: (callback: () => void, ms: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
};

export type ImportProgress = {
  tick(count?: number): void;
  setDone(done: number): void;
  setTotal(total: number): void;
  stop(): void;
};

export type ProgressView = {
  label: string;
  done: number;
  total: number;
  elapsedMs: number;
  indeterminate: boolean;
  spinnerFrame: string;
  barWidth: number;
};

export function formatElapsed(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 60_000) {
    return `${(clamped / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatPercent(done: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

export function formatBar(
  done: number,
  total: number,
  width = DEFAULT_BAR_WIDTH,
): string {
  if (width <= 0) return "[]";
  const ratio = total <= 0 ? 1 : Math.min(1, Math.max(0, done / total));
  const filled = Math.round(ratio * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

export function renderProgressLine(view: ProgressView): string {
  const elapsed = formatElapsed(view.elapsedMs);
  if (view.indeterminate) {
    return `${view.label}  [${view.spinnerFrame}]  ${elapsed}`;
  }
  const percent = formatPercent(view.done, view.total);
  const bar = formatBar(view.done, view.total, view.barWidth);
  return `${view.label}  ${bar}  ${view.done}/${view.total}  ${percent}%  ${elapsed}`;
}

/**
 * Whether a non-TTY log should print a new line for this percent.
 * `lastEmitted` is the last percent that was printed, or -1 before the first line.
 */
export function shouldEmitPlainLine(
  lastEmitted: number,
  currentPercent: number,
  step = DEFAULT_PLAIN_STEP,
): boolean {
  if (lastEmitted < 0) return true;
  if (currentPercent >= 100 && lastEmitted < 100) return true;
  return Math.floor(currentPercent / step) > Math.floor(lastEmitted / step);
}

export function shouldRedraw(
  lastDrawAt: number,
  now: number,
  throttleMs: number,
  force: boolean,
): boolean {
  if (force) return true;
  return now - lastDrawAt >= throttleMs;
}

/** Pad `text` with trailing spaces so a shorter TTY rewrite clears leftovers. */
export function padToWidth(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + " ".repeat(width - text.length);
}

export function createImportProgress(
  options: ImportProgressOptions,
): ImportProgress {
  const stream = options.stream ?? process.stdout;
  const isTTY = options.isTTY ?? stream.isTTY === true;
  const now = options.now ?? Date.now;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS;
  const plainStep = options.plainStep ?? DEFAULT_PLAIN_STEP;
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const barWidth = options.barWidth ?? DEFAULT_BAR_WIDTH;
  const schedule = options.setIntervalFn ?? setInterval;
  const clearSchedule =
    options.clearIntervalFn ??
    ((handle: unknown) => {
      clearInterval(handle as ReturnType<typeof setInterval>);
    });

  const startedAt = now();
  const label = options.label;
  let indeterminate = options.indeterminate === true || options.total == null;
  let total = options.total ?? 0;
  let done = 0;
  let stopped = false;
  let lastDrawAt = Number.NEGATIVE_INFINITY;
  let lastWrittenLen = 0;
  let lastEmittedPercent = -1;
  let lastPlainWriteAt = Number.NEGATIVE_INFINITY;
  let spinnerIndex = 0;

  const timer = schedule(() => {
    if (stopped) return;
    spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
    redraw(true);
  }, intervalMs);

  function view(): ProgressView {
    return {
      label,
      done,
      total,
      elapsedMs: now() - startedAt,
      indeterminate,
      spinnerFrame: SPINNER_FRAMES[spinnerIndex] ?? "|",
      barWidth,
    };
  }

  function percentNow(): number {
    if (indeterminate) return 0;
    return formatPercent(done, total);
  }

  function writeTTY(text: string): void {
    stream.write(`\r${padToWidth(text, lastWrittenLen)}`);
    lastWrittenLen = text.length;
  }

  function writePlain(text: string): void {
    stream.write(`${text}\n`);
    lastPlainWriteAt = now();
    lastEmittedPercent = percentNow();
  }

  function redraw(force: boolean): void {
    if (stopped) return;
    const current = now();
    // Throttle only applies to TTY in-place rewrites. Non-TTY logs emit on
    // 10% boundaries (and heartbeats), so a jump must not be swallowed.
    if (isTTY && !shouldRedraw(lastDrawAt, current, throttleMs, force)) return;

    const line = renderProgressLine(view());

    if (isTTY) {
      writeTTY(line);
      lastDrawAt = current;
      return;
    }

    const currentPercent = percentNow();
    const crossedBucket = shouldEmitPlainLine(
      lastEmittedPercent,
      currentPercent,
      plainStep,
    );
    const heartbeat =
      !indeterminate &&
      lastPlainWriteAt !== Number.NEGATIVE_INFINITY &&
      current - lastPlainWriteAt >= heartbeatMs;
    const indeterminateHeartbeat =
      indeterminate &&
      (lastPlainWriteAt === Number.NEGATIVE_INFINITY ||
        current - lastPlainWriteAt >= heartbeatMs);

    if (crossedBucket || heartbeat || indeterminateHeartbeat) {
      writePlain(line);
      lastDrawAt = current;
    }
  }

  // First paint: 0% or the opening spinner.
  redraw(true);

  return {
    tick(count = 1) {
      if (stopped) return;
      done += count;
      if (done < 0) done = 0;
      redraw(false);
    },
    setDone(next) {
      if (stopped) return;
      done = Math.max(0, next);
      redraw(false);
    },
    setTotal(next) {
      if (stopped) return;
      total = Math.max(0, next);
      indeterminate = false;
      redraw(true);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      clearSchedule(timer);
      if (!indeterminate && done >= total) {
        done = total;
      }
      const line = renderProgressLine(view());
      if (isTTY) {
        writeTTY(line);
        stream.write("\n");
        return;
      }
      if (shouldEmitPlainLine(lastEmittedPercent, percentNow(), plainStep)) {
        writePlain(line);
      }
    },
  };
}
