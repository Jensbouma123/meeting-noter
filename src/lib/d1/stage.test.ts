import { afterEach, describe, expect, it, vi } from 'vitest';
import { d1StageElapsedSeconds, getD1StageSnapshot, setD1Stage, subscribeD1Stage } from './stage';

afterEach(() => {
  setD1Stage(null);
  vi.useRealTimers();
});

describe('d1 stage store', () => {
  it('ticks the elapsed seconds once a second while subscribed, and stops when unsubscribed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
    setD1Stage({ kind: 'loading' });

    const seen: number[] = [];
    const unsubscribe = subscribeD1Stage(() => {
      const snap = getD1StageSnapshot();
      if (snap) seen.push(d1StageElapsedSeconds(snap));
    });
    vi.advanceTimersByTime(3_000);
    expect(seen).toEqual([1, 2, 3]);

    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5_000);
    expect(seen).toEqual([1, 2, 3]);
  });

  it('restarts the clock on each new stage and clears to null', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
    setD1Stage({ kind: 'sending', batch: 1 }, 1_000_000);
    vi.setSystemTime(new Date(1_004_000));
    setD1Stage({ kind: 'sending', batch: 2 }, 1_004_000);

    expect(getD1StageSnapshot()).toEqual({ stage: { kind: 'sending', batch: 2 }, since: 1_004_000, now: 1_004_000 });

    setD1Stage(null);
    expect(getD1StageSnapshot()).toBeNull();
  });
});
