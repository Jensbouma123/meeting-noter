import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserASRLoadProgress, BrowserASREvents } from './types';

const loadState = vi.hoisted(() => ({

  hold: false,

  hangCreate: false,
  failWarmUp: false,
  failCreate: false,

  holdTranscribe: false,
  transcribeCalls: [] as number[],
  melResets: 0,
  revoked: [] as string[],
  createdFrom: [] as string[],

  files: 'cached' as 'cached' | 'bytes' | 'hang',

  probe: [] as string[],

  reported: [] as Array<{ loaded: number; total: number; file: string }>,

  served: 0,
}));

vi.mock('parakeet.js', () => ({
  ParakeetModel: {
    fromUrls: async (cfg: { encoderUrl: string; decoderUrl: string }) => {
      if (loadState.hangCreate) {

        return new Promise(() => {});
      }
      while (loadState.hold) {
        await new Promise((r) => setTimeout(r, 1));
      }
      loadState.createdFrom.push(cfg.encoderUrl, cfg.decoderUrl);
      if (loadState.failCreate) throw new Error('session creation exploded');
      return {
        transcribe: async (audio: Float32Array) => {
          loadState.transcribeCalls.push(audio.length);
          while (loadState.holdTranscribe) {
            await new Promise((r) => setTimeout(r, 1));
          }
          if (loadState.failWarmUp) throw new Error('warm-up is not supported by this config');
          return { utterance_text: '', words: [], is_final: true, metrics: null };
        },
        resetMelCache: () => {
          loadState.melResets += 1;
        },
      };
    },
  },
}));

vi.mock('./resumable-download', async () => {
  const actual = await vi.importActual<typeof import('./resumable-download')>('./resumable-download');
  return {
    ...actual,
    probeCachedModelFiles: async (
      manifest: { files: readonly string[] },
      onProgress?: (probe: { done: number; total: number; file: string; cached: boolean }) => void,
    ) => {
      for (const [index, file] of manifest.files.entries()) {
        loadState.probe.push(file);
        onProgress?.({ done: index + 1, total: manifest.files.length, file, cached: true });
      }
    },
    downloadHfFileResumable: async (
      _repo: string,
      file: string,
      _revision: string,
      options?: { onProgress?: (p: { loaded: number; total: number; file: string }) => void },
    ) => {

      if (loadState.served === 0) {
        loadState.served += 1;
        if (loadState.files === 'hang') {

          return new Promise(() => {});
        }
        if (loadState.files === 'bytes') {

          for (const loaded of [400, 900]) {
            const event = { loaded, total: 900, file };
            loadState.reported.push(event);
            options?.onProgress?.(event);
            await new Promise((r) => setTimeout(r, 1));
          }
        }
      }
      return `blob:fake/${file}`;
    },
  };
});

const WASM = {
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  language: 'nl',
  backend: 'wasm',
  encoderQuant: 'int8',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  asrBackend: 'wasm',
  files: ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'],
} as const;

function recorder() {
  const progress: BrowserASRLoadProgress[] = [];
  const events: BrowserASREvents = {
    onSegment: () => {},
    onLanguage: () => {},
    onStatusChange: () => {},
    onError: () => {},
    onLoadProgress: (p) => progress.push(p),
  };
  return { progress, events };
}

let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
  loadState.hold = false;
  loadState.hangCreate = false;
  loadState.failWarmUp = false;
  loadState.failCreate = false;
  loadState.holdTranscribe = false;
  loadState.transcribeCalls.length = 0;
  loadState.melResets = 0;
  loadState.revoked.length = 0;
  loadState.createdFrom.length = 0;
  loadState.files = 'cached';
  loadState.probe.length = 0;
  loadState.reported.length = 0;
  loadState.served = 0;
  revokeObjectURL = vi.fn((url: string) => loadState.revoked.push(url));
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
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
    const { BrowserASREngine, SESSION_STALL_MS } = await import('./parakeet');
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
