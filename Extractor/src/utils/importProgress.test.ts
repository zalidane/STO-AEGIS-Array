import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createImportProgress,
  formatBar,
  formatElapsed,
  formatPercent,
  renderProgressLine,
  shouldEmitPlainLine,
  shouldRedraw,
  padToWidth,
  SPINNER_FRAMES,
} from "./importProgress.js";

describe("formatElapsed", () => {
  it("formats sub-minute times with one decimal second", () => {
    assert.equal(formatElapsed(0), "0.0s");
    assert.equal(formatElapsed(500), "0.5s");
    assert.equal(formatElapsed(12_300), "12.3s");
    assert.equal(formatElapsed(59_900), "59.9s");
  });

  it("formats a minute and longer as m ss", () => {
    assert.equal(formatElapsed(60_000), "1m 00s");
    assert.equal(formatElapsed(75_400), "1m 15s");
    assert.equal(formatElapsed(183_000), "3m 03s");
  });

  it("clamps negative values to zero", () => {
    assert.equal(formatElapsed(-100), "0.0s");
  });
});

describe("formatPercent and formatBar", () => {
  it("treats a zero total as 100% and a full bar", () => {
    assert.equal(formatPercent(0, 0), 100);
    assert.equal(formatBar(0, 0, 4), "[####]");
  });

  it("rounds percent and bar fill", () => {
    assert.equal(formatPercent(0, 44), 0);
    assert.equal(formatPercent(22, 44), 50);
    assert.equal(formatPercent(44, 44), 100);
    assert.equal(formatBar(0, 10, 10), "[----------]");
    assert.equal(formatBar(5, 10, 10), "[#####-----]");
    assert.equal(formatBar(10, 10, 10), "[##########]");
  });

  it("clamps values outside 0..total", () => {
    assert.equal(formatPercent(-1, 10), 0);
    assert.equal(formatPercent(20, 10), 100);
    assert.equal(formatBar(-5, 10, 4), "[----]");
    assert.equal(formatBar(99, 10, 4), "[####]");
  });
});

describe("renderProgressLine", () => {
  it("includes label, bar, counts, percent, and elapsed", () => {
    const line = renderProgressLine({
      label: "GwObtain",
      done: 22,
      total: 44,
      elapsedMs: 12_300,
      indeterminate: false,
      spinnerFrame: "|",
      barWidth: 20,
    });

    assert.equal(
      line,
      "GwObtain  [##########----------]  22/44  50%  12.3s",
    );
  });

  it("renders an indeterminate spinner and elapsed time", () => {
    const line = renderProgressLine({
      label: "Resolving relationships",
      done: 0,
      total: 0,
      elapsedMs: 14_200,
      indeterminate: true,
      spinnerFrame: "/",
      barWidth: 20,
    });

    assert.equal(line, "Resolving relationships  [/]  14.2s");
  });
});

describe("shouldEmitPlainLine", () => {
  it("emits the first line even at 0%", () => {
    assert.equal(shouldEmitPlainLine(-1, 0), true);
  });

  it("emits only when a new 10% bucket is reached", () => {
    assert.equal(shouldEmitPlainLine(0, 9), false);
    assert.equal(shouldEmitPlainLine(0, 10), true);
    assert.equal(shouldEmitPlainLine(10, 19), false);
    assert.equal(shouldEmitPlainLine(12, 20), true);
  });

  it("emits 100% even after a jump that skips buckets", () => {
    assert.equal(shouldEmitPlainLine(0, 100), true);
    assert.equal(shouldEmitPlainLine(100, 100), false);
  });
});

describe("shouldRedraw", () => {
  it("throttles unforced redraws and always allows a forced one", () => {
    assert.equal(shouldRedraw(1000, 1050, 80, false), false);
    assert.equal(shouldRedraw(1000, 1080, 80, false), true);
    assert.equal(shouldRedraw(1000, 1010, 80, true), true);
  });
});

describe("padToWidth", () => {
  it("pads a shorter string and leaves a longer one unchanged", () => {
    assert.equal(padToWidth("abc", 6), "abc   ");
    assert.equal(padToWidth("abcdef", 4), "abcdef");
    assert.equal(padToWidth("abc", 3), "abc");
  });
});

type FakeHandle = { cb: () => void; ms: number; cleared: boolean };

function startFake(options: {
  label?: string;
  total?: number;
  indeterminate?: boolean;
  isTTY: boolean;
  heartbeatMs?: number;
  throttleMs?: number;
  intervalMs?: number;
}) {
  let nowMs = 1_000_000;
  const writes: string[] = [];
  const intervals: FakeHandle[] = [];

  const progress = createImportProgress({
    label: options.label ?? "GwObtain",
    ...(options.total != null ? { total: options.total } : {}),
    ...(options.indeterminate != null
      ? { indeterminate: options.indeterminate }
      : {}),
    stream: {
      write(chunk: string) {
        writes.push(chunk);
        return true;
      },
    },
    isTTY: options.isTTY,
    now: () => nowMs,
    intervalMs: options.intervalMs ?? 250,
    throttleMs: options.throttleMs ?? 80,
    heartbeatMs: options.heartbeatMs ?? 15_000,
    setIntervalFn: (cb, ms) => {
      const handle: FakeHandle = { cb, ms, cleared: false };
      intervals.push(handle);
      return handle;
    },
    clearIntervalFn: (handle) => {
      (handle as FakeHandle).cleared = true;
    },
  });

  return {
    progress,
    writes,
    intervals,
    advance(ms: number) {
      nowMs += ms;
    },
    fireInterval() {
      for (const handle of intervals) {
        if (!handle.cleared) handle.cb();
      }
    },
  };
}

describe("createImportProgress TTY", () => {
  it("rewrites one line with carriage return and no mid-progress newlines", () => {
    const fake = startFake({ isTTY: true, total: 44 });

    assert.equal(fake.writes.length, 1);
    assert.match(fake.writes[0]!, /^\rGwObtain  \[.+]  0\/44  0%  0\.0s$/);
    assert.doesNotMatch(fake.writes[0]!, /\n/);

    fake.advance(1_000);
    fake.progress.tick();
    assert.equal(fake.writes.length, 2);
    assert.match(fake.writes[1]!, /^\rGwObtain  \[.+]  1\/44  2%  1\.0s$/);

    fake.progress.setDone(44);
    fake.progress.stop();
    assert.equal(fake.intervals[0]?.cleared, true);
    assert.ok(fake.writes.at(-2)?.startsWith("\r"));
    assert.equal(fake.writes.at(-1), "\n");
    assert.match(
      fake.writes.at(-2)!,
      /GwObtain  \[#{20}]  44\/44  100%  1\.0s/,
    );
  });

  it("keeps elapsed ticking on the interval when row counts do not change", () => {
    const fake = startFake({ isTTY: true, total: 44 });
    const before = fake.writes.length;

    fake.advance(2_500);
    fake.fireInterval();

    assert.equal(fake.writes.length, before + 1);
    assert.match(fake.writes.at(-1)!, /0\/44  0%  2\.5s/);
  });

  it("throttles rapid tick redraws but still honors the interval", () => {
    const fake = startFake({ isTTY: true, total: 100, throttleMs: 80 });
    const afterStart = fake.writes.length;

    fake.advance(20);
    fake.progress.tick();
    fake.advance(20);
    fake.progress.tick();
    assert.equal(fake.writes.length, afterStart);

    fake.advance(50);
    fake.progress.tick();
    assert.equal(fake.writes.length, afterStart + 1);
    assert.match(fake.writes.at(-1)!, /3\/100/);

    fake.advance(250);
    fake.fireInterval();
    assert.match(fake.writes.at(-1)!, /3\/100  3%  0\.3s/);
  });

  it("is a no-op after stop, and always clears the timer", () => {
    const fake = startFake({ isTTY: true, total: 2 });
    fake.progress.stop();
    const count = fake.writes.length;
    fake.progress.tick();
    fake.progress.setDone(1);
    fake.progress.setTotal(5);
    fake.progress.stop();
    fake.fireInterval();
    assert.equal(fake.writes.length, count);
    assert.equal(fake.intervals[0]?.cleared, true);
  });
});

describe("createImportProgress non-TTY", () => {
  it("prints a plain line about every 10% with no carriage returns", () => {
    const fake = startFake({ isTTY: false, total: 44 });

    assert.deepEqual(fake.writes, [
      "GwObtain  [--------------------]  0/44  0%  0.0s\n",
    ]);

    fake.progress.setDone(4); // 9%
    assert.equal(fake.writes.length, 1);

    fake.progress.setDone(5); // 11%
    assert.equal(fake.writes.length, 2);
    assert.equal(
      fake.writes[1],
      "GwObtain  [##------------------]  5/44  11%  0.0s\n",
    );

    fake.progress.setDone(44);
    fake.progress.stop();
    assert.equal(fake.writes.at(-1), "GwObtain  [####################]  44/44  100%  0.0s\n");
    assert.ok(fake.writes.every((chunk) => !chunk.includes("\r")));
    assert.equal(fake.intervals[0]?.cleared, true);
  });

  it("emits a heartbeat line with updated elapsed when a table stalls", () => {
    const fake = startFake({
      isTTY: false,
      total: 44,
      heartbeatMs: 15_000,
    });

    fake.advance(14_000);
    fake.fireInterval();
    assert.equal(fake.writes.length, 1);

    fake.advance(1_000);
    fake.fireInterval();
    assert.equal(fake.writes.length, 2);
    assert.equal(
      fake.writes[1],
      "GwObtain  [--------------------]  0/44  0%  15.0s\n",
    );
  });

  it("does not reprint 100% on stop when that line was already written", () => {
    const fake = startFake({ isTTY: false, total: 10 });
    fake.progress.setDone(10);
    const count = fake.writes.length;
    assert.match(fake.writes.at(-1)!, /10\/10  100%/);
    fake.progress.stop();
    assert.equal(fake.writes.length, count);
  });
});

describe("createImportProgress indeterminate", () => {
  it("advances the spinner and elapsed on each interval tick", () => {
    const fake = startFake({
      isTTY: true,
      indeterminate: true,
      label: "Resolving relationships",
    });

    assert.match(fake.writes[0]!, /^\rResolving relationships  \[\|]  0\.0s$/);

    fake.advance(250);
    fake.fireInterval();
    assert.equal(
      fake.writes[1],
      `\rResolving relationships  [${SPINNER_FRAMES[1]}]  0.3s`,
    );

    fake.progress.setTotal(4);
    fake.advance(80);
    fake.progress.tick(2);
    assert.match(fake.writes.at(-1)!, /2\/4  50%/);
    fake.progress.setDone(4);
    fake.progress.stop();
    assert.match(fake.writes.at(-2)!, /4\/4  100%/);
  });

  it("prints occasional plain spinner lines in non-TTY mode", () => {
    const fake = startFake({
      isTTY: false,
      indeterminate: true,
      label: "Resolving relationships",
      heartbeatMs: 15_000,
    });

    assert.equal(fake.writes[0], "Resolving relationships  [|]  0.0s\n");
    fake.advance(15_000);
    fake.fireInterval();
    assert.equal(fake.writes.length, 2);
    assert.match(fake.writes[1]!, /Resolving relationships  \[[|/\\-]\]  15\.0s\n/);
    fake.progress.stop();
  });
});
