// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const release = vi.fn().mockResolvedValue(undefined);
vi.mock('./store', () => ({ meeting: { release } }));

const { useReleaseOnUnmount } = await import('./useReleaseOnUnmount');

function Dock() {
  useReleaseOnUnmount();
  return null;
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('useReleaseOnUnmount', () => {
  beforeEach(() => release.mockClear());

  it("does not end the recording on StrictMode's simulated unmount", async () => {
    const root = createRoot(document.createElement('div'));
    await act(async () => {
      root.render(
        <StrictMode>
          <Dock />
        </StrictMode>,
      );
    });
    await Promise.resolve();
    expect(release).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('ends the recording when the view is replaced (navigating to another session)', async () => {
    const root = createRoot(document.createElement('div'));
    await act(async () => root.render(<Dock key="a" />));
    await act(async () => root.render(<Dock key="b" />));
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
  });
});
