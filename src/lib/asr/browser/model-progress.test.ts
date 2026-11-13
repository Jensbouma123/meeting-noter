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
    for (let i = 1; i < percents.length; i += 1) {
      expect(percents[i] as number).toBeGreaterThanOrEqual(percents[i - 1] as number);
    }
    expect(percents[percents.length - 2]).toBe(80);
    expect(percents[percents.length - 1]).toBe(100);
  });

  it('weights the stages it was given, and the shipped weights sum to 1', () => {
    const total = INIT_STAGE_WEIGHTS.files + INIT_STAGE_WEIGHTS.session + INIT_STAGE_WEIGHTS.warmup;
    expect(total).toBeCloseTo(1, 10);
    expect(INIT_STAGE_WEIGHTS.session).toBeGreaterThan(INIT_STAGE_WEIGHTS.files);
  });

  it('is a real fraction of the file stage, not a per-file step', () => {
    const weights = { files: 0.8, session: 0.1, warmup: 0.1 };
    expect(initProgressPercent(init({ filesDone: 3 }), weights)).toBe(60);
    expect(initProgressPercent(init({ filesDone: 4 }), weights)).toBe(80);
  });

  it('is indeterminate when the file stage cannot be counted and nothing is done yet', () => {
    expect(initProgressPercent(emptyInitProgress())).toBeNull();
  });

  it('reports the remainder once the session exists, even with an unmeasured file stage', () => {
    expect(initProgressPercent({ ...emptyInitProgress(), sessionsCreated: true })).toBe(45);
    expect(
      initProgressPercent({ ...emptyInitProgress(), sessionsCreated: true, warmedUp: true }),
    ).toBe(100);
  });

  it('does not go backwards when a warm-up is reported without a session', () => {
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
    expect(formatModelProgressLabel('initializing', null)).toBe('Initializing model');
    expect(formatModelProgressLabel('downloading', null)).toBe('Downloading model');
  });
});
