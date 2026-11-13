import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installLocalStorage, KEY, loadRegistry } from './model-registry.test-support';

beforeEach(() => {
  vi.resetModules();
  installLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('updateProgress throttling', () => {
  it('does not write localStorage per chunk, and still persists the terminal state', async () => {
    const registry = await loadRegistry();
    const setItem = vi.spyOn(localStorage, 'setItem');

    for (let i = 1; i <= 1_000; i++) {
      registry.updateProgress(KEY, i * 1_000, 1_000_000, 'encoder-model.int8.onnx', 0, 0);
    }

    expect(setItem.mock.calls.length).toBeLessThanOrEqual(2);
    expect(registry.getState().entries[KEY].progress.loadedBytes).toBe(1_000_000);

    registry.markCached(KEY);
    const persisted = JSON.parse(localStorage.getItem('mn.model-registry.v1')!);
    expect(persisted[KEY].status).toBe('cached');
    expect(persisted[KEY].progress.loadedBytes).toBe(1_000_000);
  });

  it('delivers the last progress of a burst with a trailing notify', async () => {
    vi.useFakeTimers();
    try {
      const registry = await loadRegistry();
      const listener = vi.fn();
      registry.subscribe(listener);
      registry.updateProgress(KEY, 1, 10, 'f', 0, 0);
      registry.updateProgress(KEY, 2, 10, 'f', 0, 0);
      registry.updateProgress(KEY, 3, 10, 'f', 0, 0);
      const immediate = listener.mock.calls.length;
      expect(immediate).toBeLessThanOrEqual(1);

      vi.advanceTimersByTime(300);
      expect(listener.mock.calls.length).toBe(immediate + 1);
      expect(registry.getState().entries[KEY].progress.loadedBytes).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('persisted downloading status', () => {
  it('reloads as not-downloaded, since no download survives a reload', async () => {
    const registry = await loadRegistry();
    registry.markDownloading(KEY, 1_000);

    vi.resetModules();
    vi.stubGlobal('window', {});
    const reloaded = await import('./model-registry');
    reloaded.initRegistry();

    expect(reloaded.getModelStatus(KEY)!.status).toBe('not-downloaded');
  });
});
