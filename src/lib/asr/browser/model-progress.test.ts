import { describe, expect, it } from 'vitest';
import {
  INIT_STAGE_WEIGHTS,
  currentInitStage,
  describeInitStage,
  downloadProgressPercent,
  emptyInitProgress,
  formatModelProgressLabel,
  initProgressPercent,
  type InitProgress,
} from './model-progress';

/**
 * The progress arithmetic, pinned against the one thing it must never do:
 * lie.
 *
 * ORT has no progress API, so the initialization half of this bar is built
 * from milestones that genuinely completed. That makes these tests mostly
 * about the *shape* of the mapping — monotonic, weighted, capped below 100,
 * and `null` (indeterminate) rather than invented whenever a stage can't be
 * measured. A "smooth 0→100 timer" would pass a test that only checked
 * "goes up and reaches 100"; every assertion here is chosen to fail one.
 */

const init = (overrides: Partial<InitProgress> = {}): InitProgress => ({
  ...emptyInitProgress(),
  filesTotal: 4,
  ...overrides,
});

describe('downloadProgressPercent', () => {
  it('is the real byte ratio across all the model files', () => {
    expect(downloadProgressPercent({ loadedBytes: 512, totalBytes: 1024 })).toBe(50);
    expect(downloadProgressPercent({ loadedBytes: 0, totalBytes: 1024 })).toBe(0);
    expect(downloadProgressPercent({ loadedBytes: 256, totalBytes: 1024 })).toBe(25);
  });

  it('never shows 100% for a finished download — 100% means "ready"', () => {
    // Every byte is there, but the session still has to be created, and a bar
    // that reads 100% while the engine is loading is a promise the app
    // cannot keep. 1023/1024 rounds to 100 on its own, so the cap has to
    // come from the clamp, not from the ratio.
    expect(downloadProgressPercent({ loadedBytes: 1023, totalBytes: 1024 })).toBe(99);
    expect(downloadProgressPercent({ loadedBytes: 1024, totalBytes: 1024 })).toBe(99);
  });

  it('clamps a total that turned out to be an underestimate', () => {
    expect(downloadProgressPercent({ loadedBytes: 2000, totalBytes: 1000 })).toBe(99);
  });

  it('is indeterminate while a resume is still setting up — the bar is not moving yet', () => {
    expect(
      downloadProgressPercent({ loadedBytes: 512, totalBytes: 1024, resuming: true }),
    ).toBeNull();
  });

  it('is indeterminate with no total, no progress, or a nonsense total', () => {
    expect(downloadProgressPercent({ loadedBytes: 512, totalBytes: 0 })).toBeNull();
    expect(downloadProgressPercent(null)).toBeNull();
    expect(downloadProgressPercent(undefined)).toBeNull();
    expect(downloadProgressPercent({ loadedBytes: 10, totalBytes: Number.NaN })).toBeNull();
    expect(downloadProgressPercent({ loadedBytes: Number.NaN, totalBytes: 100 })).toBeNull();
  });
});

describe('initProgressPercent', () => {
  it('rises only as real stages complete, and never reaches 100 before ready', () => {
    const stages: Array<[InitProgress, number]> = [
      [init({ filesDone: 0 }), 0],
      [init({ filesDone: 1 }), 9],
      [init({ filesDone: 2 }), 18],
      [init({ filesDone: 4 }), 35],
      [init({ filesDone: 4, sessionsCreated: true }), 80],
      [init({ filesDone: 4, sessionsCreated: true, warmedUp: true }), 100],
    ];
    const percents = stages.map(([state]) => initProgressPercent(state));
    for (const percent of percents) {
      expect(percent).not.toBeNull();
    }
    // Monotonic: progress only ever moves forward.
    for (let i = 1; i < percents.length; i += 1) {
      expect(percents[i] as number).toBeGreaterThanOrEqual(percents[i - 1] as number);
    }
    // 100 is reserved for "ready" — every pre-warm-up stage tops out at 99.
    expect(percents[percents.length - 2]).toBe(80);
    expect(percents[percents.length - 1]).toBe(100);
  });

  it('weights the stages it was given, and the shipped weights sum to 1', () => {
    const total = INIT_STAGE_WEIGHTS.files + INIT_STAGE_WEIGHTS.session + INIT_STAGE_WEIGHTS.warmup;
    expect(total).toBeCloseTo(1, 10);
    // Session creation is the stage that has historically hung or failed, so
    // it is worth the most — a bar that spends its life at 0% while ORT builds
    // sessions is as useless as no bar at all.
    expect(INIT_STAGE_WEIGHTS.session).toBeGreaterThan(INIT_STAGE_WEIGHTS.files);
  });

  it('is a real fraction of the file stage, not a per-file step', () => {
    // 3 of 4 files: three quarters of that stage's weight, not 75% overall.
    const weights = { files: 0.8, session: 0.1, warmup: 0.1 };
    expect(initProgressPercent(init({ filesDone: 3 }), weights)).toBe(60);
    expect(initProgressPercent(init({ filesDone: 4 }), weights)).toBe(80);
  });

  it('is indeterminate when the file stage cannot be counted and nothing is done yet', () => {
    // No file list at all: any number would be invented, so the UI gets
    // `null` and shows the stage name instead of a fake fill.
    expect(initProgressPercent(emptyInitProgress())).toBeNull();
  });

  it('reports the remainder once the session exists, even with an unmeasured file stage', () => {
    expect(initProgressPercent({ ...emptyInitProgress(), sessionsCreated: true })).toBe(45);
    expect(
      initProgressPercent({ ...emptyInitProgress(), sessionsCreated: true, warmedUp: true }),
    ).toBe(100);
  });

  it('does not go backwards when a warm-up is reported without a session', () => {
    // Defensive: a malformed event must not make the bar jump to 100% on
    // the strength of a warm-up alone.
    expect(initProgressPercent(init({ filesDone: 4, warmedUp: true }))).toBe(55);
  });

  it('clamps a file count that overshoots the total', () => {
    expect(initProgressPercent(init({ filesDone: 9 }))).toBe(35);
  });
});

describe('currentInitStage / describeInitStage', () => {
  it('walks files → session → warmup, then reports no stage at all', () => {
    expect(currentInitStage(init({ filesDone: 1 }))).toBe('files');
    expect(currentInitStage(init({ filesDone: 4 }))).toBe('session');
    expect(currentInitStage(init({ filesDone: 4, sessionsCreated: true }))).toBe('warmup');
    expect(currentInitStage(init({ filesDone: 4, sessionsCreated: true, warmedUp: true }))).toBeNull();
  });

  it('counts the files while they are being read', () => {
    expect(describeInitStage(init({ filesDone: 2 }))).toBe('2/4 files');
    expect(describeInitStage(init({ filesDone: 4, sessionsCreated: true }))).toBe(
      'Warming up the model',
    );
    expect(
      describeInitStage(init({ filesDone: 4, sessionsCreated: true, warmedUp: true })),
    ).toBeNull();
  });

  it('names the session stage when there is no file list to count', () => {
    expect(describeInitStage(emptyInitProgress())).toBe('Creating the model session');
  });
});

describe('formatModelProgressLabel', () => {
  it('carries the percentage when there is one', () => {
    expect(formatModelProgressLabel('downloading', 42)).toBe('Downloading model 42%');
    expect(formatModelProgressLabel('initializing', 60)).toBe('Initializing model 60%');
  });

  it('drops the percentage entirely when there is nothing to report', () => {
    // Never "Initializing model 0%" for a stage that has no measurable
    // progress — that reads as "stuck at the start" rather than "unknown".
    expect(formatModelProgressLabel('initializing', null)).toBe('Initializing model');
    expect(formatModelProgressLabel('downloading', null)).toBe('Downloading model');
  });
});
