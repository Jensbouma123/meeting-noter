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

describe('a file that is not cached yet', () => {
  it('reports the real byte counts while it is downloaded during the load', async () => {
    loadState.files = 'bytes';
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    const fetches = progress.filter((p) => p.stage === 'fetch');

    expect(fetches.map((p) => p.loadedBytes)).toEqual([400, 900]);
    expect(fetches.every((p) => p.totalBytes === 900 && p.file === 'encoder-model.int8.onnx')).toBe(
      true,
    );

    expect(progress.filter((p) => p.stage === 'files').map((p) => p.done)).toEqual([0, 1, 2, 3]);
  });

  it('says nothing about fetching when the cache served the files', async () => {

    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    expect(progress.some((p) => p.stage === 'fetch')).toBe(false);
  });

  it('fails the load with an actionable message when the bytes stop coming', async () => {
    loadState.files = 'hang';
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    vi.useFakeTimers();
    const loaded = new BrowserASREngine({ ...WASM }, events).ensureLoaded();
    const assertion = expect(loaded).rejects.toThrow(/made no progress/);
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    vi.useRealTimers();

    expect(progress.map((p) => p.stage)).toEqual(['files', 'files', 'files', 'files']);
  });

  it('fails the load with an actionable message when session creation hangs', async () => {

    loadState.hangCreate = true;
    const { BrowserASREngine } = await import('./parakeet');
    const { SESSION_STALL_MS } = await import('./engine-load');
    const { progress, events } = recorder();

    vi.useFakeTimers();
    const loaded = new BrowserASREngine({ ...WASM }, events).ensureLoaded();
    const assertion = expect(loaded).rejects.toThrow(/made no progress/);
    await vi.advanceTimersByTimeAsync(SESSION_STALL_MS + 60_000);
    await assertion;
    vi.useRealTimers();

    expect(progress.map((p) => p.stage)).toEqual(['files', 'files', 'files', 'files']);

    expect(new Set(loadState.revoked)).toEqual(
      new Set([...WASM.files].map((file) => `blob:fake/${file}`)),
    );
  });

  it('does not cut off a transfer that is still moving', async () => {

    loadState.files = 'bytes';
    const { BrowserASREngine } = await import('./parakeet');
    const { events } = recorder();
    const engine = new BrowserASREngine({ ...WASM }, events);

    vi.useFakeTimers();
    const loaded = engine.ensureLoaded();
    for (let i = 0; i < 6; i += 1) {
      await vi.advanceTimersByTimeAsync(20_000);
    }
    vi.useRealTimers();
    await loaded;

    expect(loadState.reported).toHaveLength(2);
    expect(engine.isReady).toBe(true);
  });
});

describe('BrowserASREngine readiness during an inference', () => {
  it('stays ready while an inference runs, so a frame arriving mid-inference loads nothing', async () => {

    const { BrowserASREngine } = await import('./parakeet');
    const { events } = recorder();
    const engine = new BrowserASREngine({ ...WASM }, events);
    await engine.ensureLoaded();
    const loads = loadState.createdFrom.length;

    loadState.holdTranscribe = true;
    const inference = engine.transcribe(new Float32Array(32_000), 'mic', 'mic:0', false);
    await new Promise((r) => setTimeout(r, 5));
    expect(engine.getStatus()).toBe('transcribing');
    expect(engine.isReady).toBe(true);
    await engine.ensureLoaded();
    expect(loadState.createdFrom.length).toBe(loads);

    loadState.holdTranscribe = false;
    await inference;
    expect(engine.isReady).toBe(true);
  });
});
