import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WASM, loadState, recorder, resetLoadState } from './parakeet.progress.test-support';

vi.mock('parakeet.js', async () => (await import('./parakeet.progress.test-support')).parakeetJsMock());
vi.mock('./resumable-download', async () => (await import('./parakeet.progress.test-support')).resumableDownloadMock());

beforeEach(() => {
  resetLoadState();
});

afterEach(() => {
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  vi.restoreAllMocks();
});

describe('BrowserASREngine load progress (teardown)', () => {
  it('keeps loading when the warm-up fails — a missing stage, not a failed model', async () => {
    loadState.failWarmUp = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    const engine = new BrowserASREngine({ ...WASM }, events);
    await expect(engine.ensureLoaded()).resolves.toBeUndefined();

    expect(engine.isReady).toBe(true);
    expect(progress.map((p) => p.stage)).toEqual([
      'files',
      'files',
      'files',
      'files',
      'session',
    ]);
    expect(warn).toHaveBeenCalled();
  });

  it('releases every model blob URL once the sessions exist', async () => {
    const { BrowserASREngine } = await import('./parakeet');
    const { events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    expect(loadState.createdFrom.length).toBeGreaterThan(0);

    expect(new Set(loadState.revoked)).toEqual(
      new Set([...WASM.files].map((file) => `blob:fake/${file}`)),
    );
  });

  it('releases the blob URLs even when session creation fails', async () => {

    loadState.failCreate = true;
    const { BrowserASREngine } = await import('./parakeet');
    const { events } = recorder();

    await expect(new BrowserASREngine({ ...WASM }, events).ensureLoaded()).rejects.toThrow(
      'session creation exploded',
    );
    expect(new Set(loadState.revoked)).toEqual(
      new Set([...WASM.files].map((file) => `blob:fake/${file}`)),
    );
  });

  it('keeps the model across a session stop, so the next recording does not rebuild it', async () => {
    const { BrowserASREngine } = await import('./parakeet');
    const { events } = recorder();
    const engine = new BrowserASREngine({ ...WASM }, events);
    await engine.ensureLoaded();
    expect(loadState.createdFrom.length).toBe(2);

    await engine.stop();

    expect(engine.isReady).toBe(true);
    await engine.ensureLoaded();
    expect(loadState.createdFrom.length).toBe(2);
  });

  it('releases the model on disable — the one teardown that lets the sessions go', async () => {
    const { BrowserASREngine } = await import('./parakeet');
    const { events } = recorder();
    const engine = new BrowserASREngine({ ...WASM }, events);
    await engine.ensureLoaded();

    engine.disable();

    expect(engine.isReady).toBe(false);
  });
});
