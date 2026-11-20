import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyLiveIdle, waitForLiveIdle } from './live-idle';
import { asrState } from './state';

afterEach(() => {
  asrState.transcribeInFlight = false;
  vi.useRealTimers();
});

describe('waitForLiveIdle', () => {
  it('resolves on the pump idle signal without waiting on any timer', async () => {
    vi.useFakeTimers();
    asrState.transcribeInFlight = true;
    const settled = vi.fn();
    void waitForLiveIdle(1000).then(settled);
    notifyLiveIdle();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    asrState.transcribeInFlight = false;
    notifyLiveIdle();
    await Promise.resolve();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives up after the timeout when live ASR stays busy', async () => {
    vi.useFakeTimers();
    asrState.transcribeInFlight = true;
    const settled = vi.fn();
    void waitForLiveIdle(1000).then(settled);
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('resolves at once when live ASR is already idle', async () => {
    await expect(waitForLiveIdle(1000)).resolves.toBeUndefined();
  });
});
