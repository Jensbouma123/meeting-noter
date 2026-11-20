import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_LAUNCH_WAIT_MS, launchAppLink } from './launchAppLink';
import type { LaunchDeps } from './launchAppLink.types';

function fakeDeps() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), {
    visibilityState: 'visible' as DocumentVisibilityState,
  });
  const deps = {
    navigate: vi.fn(),
    openWeb: vi.fn(),
    win: Object.assign(win, {
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    }),
    doc,
  } as unknown as LaunchDeps & {
    navigate: ReturnType<typeof vi.fn>;
    openWeb: ReturnType<typeof vi.fn>;
  };
  return { deps, win, doc };
}

afterEach(() => vi.useRealTimers());

describe('launchAppLink', () => {
  it('opens the app link and stays out of the browser when the app takes focus', () => {
    vi.useFakeTimers();
    const { deps, win } = fakeDeps();
    launchAppLink('claude://claude.ai/new?q=hi', 'https://claude.ai/new?q=hi', deps);
    expect(deps.navigate).toHaveBeenCalledWith('claude://claude.ai/new?q=hi');
    win.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(APP_LAUNCH_WAIT_MS);
    expect(deps.openWeb).not.toHaveBeenCalled();
  });

  it('falls back to the web URL when no app answers the link', () => {
    vi.useFakeTimers();
    const { deps } = fakeDeps();
    launchAppLink('claude://claude.ai/new?q=hi', 'https://claude.ai/new?q=hi', deps);
    vi.advanceTimersByTime(APP_LAUNCH_WAIT_MS);
    expect(deps.openWeb).toHaveBeenCalledWith('https://claude.ai/new?q=hi');
  });
});
