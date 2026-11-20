import { liveBusy } from './live-state';

const idleWaiters = new Set<() => void>();

// Resolved from the live pump (driven by worklet frames and engine replies), not
// by polling: hidden tabs clamp timers to >= 1 s, so a 25 ms poll never saw idle.
export function notifyLiveIdle(): void {
  if (idleWaiters.size === 0 || liveBusy()) return;
  const waiters = [...idleWaiters];
  idleWaiters.clear();
  for (const resolve of waiters) resolve();
}

export function waitForLiveIdle(timeoutMs: number): Promise<void> {
  if (!liveBusy()) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      idleWaiters.delete(done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    idleWaiters.add(done);
  });
}
