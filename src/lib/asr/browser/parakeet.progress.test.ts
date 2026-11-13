import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WASM, loadState, recorder, resetLoadState } from './parakeet.progress.test-support';

vi.mock('parakeet.js', async () => (await import('./parakeet.progress.test-support')).parakeetJsMock());
vi.mock('./resumable-download', async () => (await import('./parakeet.progress.test-support')).resumableDownloadMock());

let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
  revokeObjectURL = resetLoadState();
});

afterEach(() => {
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  vi.restoreAllMocks();
});

describe('BrowserASREngine load progress', () => {
  it('reports every file read, then the session, then the warm-up — in that order', async () => {
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    const engine = new BrowserASREngine({ ...WASM }, events);
    await engine.ensureLoaded();

    expect(engine.isReady).toBe(true);
    const files = progress.filter((p) => p.stage === 'files');

    expect(files.map((p) => p.done)).toEqual([0, 1, 2, 3]);
    expect(files.every((p) => p.total === 3)).toBe(true);

    expect(progress.map((p) => p.stage)).toEqual([
      'files',
      'files',
      'files',
      'files',
      'session',
      'warmup',
    ]);

    expect(loadState.transcribeCalls).toEqual([16000]);
    expect(loadState.melResets).toBe(1);
  });

  it('still counts the files when the cache is empty — the stage is the read, not the hit', async () => {
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    expect(progress.filter((p) => p.stage === 'files').map((p) => p.done)).toEqual([0, 1, 2, 3]);
  });

  it('does not claim a session before session creation has resolved', async () => {
    loadState.hold = true;
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    const engine = new BrowserASREngine({ ...WASM }, events);
    const loaded = engine.ensureLoaded();

    await new Promise((r) => setTimeout(r, 20));
    expect(progress.map((p) => p.stage)).toEqual(['files', 'files', 'files', 'files']);
    expect(engine.isReady).toBe(false);

    loadState.hold = false;
    await loaded;
    expect(progress.map((p) => p.stage)).toEqual([
      'files',
      'files',
      'files',
      'files',
      'session',
      'warmup',
    ]);
  });

  it('says the manifest is incomplete rather than inventing a file list, and fakes no progress', async () => {

    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await expect(
      new BrowserASREngine(
        { ...WASM, files: [] as unknown as typeof WASM.files },
        events,
      ).ensureLoaded(),
    ).rejects.toThrow(/manifest is missing required files/);

    expect(progress.filter((p) => p.stage === 'files')).toEqual([]);
    expect(progress.map((p) => p.stage)).toEqual([]);
  });
});
