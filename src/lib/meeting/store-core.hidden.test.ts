import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadStore(visibility: { state: string }) {
  vi.resetModules();
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('document', {
    get visibilityState() {
      return visibility.state;
    },
  });
  const store = await import('./store-core');
  const listener = vi.fn();
  store.subscribe(listener);
  return { store, listener, frames };
}

afterEach(() => vi.unstubAllGlobals());

describe('store emit while the tab is hidden', () => {
  it('notifies subscribers without an animation frame, which hidden tabs never run', async () => {
    const { store, listener, frames } = await loadStore({ state: 'hidden' });
    store.setState({ status: 'live' });
    store.setState({ warning: 'x' });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(0);
  });

  it('still notifies when a frame was queued just before the tab went hidden', async () => {
    const visibility = { state: 'visible' };
    const { store, listener, frames } = await loadStore(visibility);
    store.setState({ status: 'live' });
    expect(frames).toHaveLength(1);
    visibility.state = 'hidden';
    store.setState({ warning: 'x' });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    frames[0](0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('batches to one animation frame while visible', async () => {
    const { store, listener, frames } = await loadStore({ state: 'visible' });
    store.setState({ status: 'live' });
    store.setState({ warning: 'x' });
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    frames[0](0);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
