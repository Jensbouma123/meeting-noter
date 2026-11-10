import { beforeEach, describe, expect, it, vi } from 'vitest';

const posted: Array<{
  type: string;
  id: string;
  message?: string;
  code?: string;
  backend?: string;
  speakerState?: unknown;
}> = [];
let failLoad = true;
let backend: 'webgpu' | 'wasm' = 'wasm';
let releaseLoad: () => void = () => {};
const cores: Array<{
  options: {
    mode: { chunkLength: number };
    turns?: { provisional?: boolean };
    speakerState?: { numFrames: number; embeds: Float32Array } | null;
  };
  pushed: Array<number | undefined>;
}> = [];
/** What a fake core's `snapshotSpeakers` returns. */
let coreSnapshot = { numFrames: 0, compressed: false, embeds: new Float32Array(0), probs: new Float32Array(0) };

vi.mock('./downloader', () => ({
  assertDiarizationModelsCached: async () => {
    if (failLoad) throw new Error('not downloaded');
  },
  downloadDiarizationModels: async () => ({}),
  modelSource: () => new Uint8Array(),
  revokeModelUrls: () => {},
}));
vi.mock('./sortformer-model', () => ({
  SortformerModel: class {
    backend: string | null = null;
    async load() {
      await new Promise<void>((resolve) => {
        releaseLoad = resolve;
      });
      this.backend = backend;
    }
    dispose() {}
    run() {}
  },
}));
vi.mock('./core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./core')>()),
  DiarizerCore: class {
    readonly pushed: Array<number | undefined> = [];
    constructor(readonly options: never) {
      cores.push(this as never);
    }
    onSpeakerTurn() {}
    push(_chunk: Float32Array, startSample?: number) {
      this.pushed.push(startSample);
    }
    async flush() {}
    snapshotSpeakers() {
      return coreSnapshot;
    }
    dispose() {}
  },
}));

const flush = () => new Promise((r) => setTimeout(r, 0));

async function loadWorker() {
  const ctx = { postMessage: (m: never) => posted.push(m), onmessage: null as never };
  vi.stubGlobal('self', ctx);
  await import('./worker');
  return (m: unknown) => (ctx.onmessage as (e: unknown) => void)({ data: m });
}

describe('diarization worker', () => {
  beforeEach(() => {
    posted.length = 0;
    cores.length = 0;
    vi.resetModules();
  });

  it('reports a load failure and forgets a disposed-before-ready id (F1, F4)', async () => {
    failLoad = true;
    const send = await loadWorker();

    send({ type: 'init', id: 'a', source: 'mic' });
    send({ type: 'dispose', id: 'a' });
    await flush();
    expect(posted).toEqual([{ type: 'error', id: 'a', message: 'not downloaded', code: 'not-cached' }]);

    // Same id re-inited after a successful load must not be swallowed by a
    // stale disposedBeforeReady entry.
    failLoad = false;
    send({ type: 'init', id: 'a', source: 'mic' });
    await flush();
    releaseLoad();
    await flush();
    expect(posted.some((m) => m.type === 'ready' && m.id === 'a')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('replays audio pushed while the model loaded, newest 30 s only, and says which backend', async () => {
    failLoad = false;
    backend = 'wasm';
    const send = await loadWorker();
    const { MAX_PENDING_SAMPLES } = await import('./worker');

    send({ type: 'init', id: 'b', source: 'mic' });
    const chunk = 16_000; // 1 s
    const pushes = MAX_PENDING_SAMPLES / chunk + 5;
    for (let i = 0; i < pushes; i += 1) {
      send({ type: 'push', id: 'b', chunk: new Float32Array(chunk), startSample: i * chunk });
    }
    await flush();
    releaseLoad();
    await flush();

    expect(posted).toContainEqual({ type: 'ready', id: 'b', backend: 'wasm' });
    expect(cores).toHaveLength(1);
    // The oldest 5 s were dropped; what is kept is contiguous from there.
    expect(cores[0].pushed[0]).toBe(5 * chunk);
    expect(cores[0].pushed).toHaveLength(MAX_PENDING_SAMPLES / chunk);
    expect(cores[0].options.turns?.provisional).toBe(true);
    vi.unstubAllGlobals();
  });

  it('streams 2 s chunks on WebGPU and 4 s chunks on WASM', async () => {
    failLoad = false;
    const { DEFAULT_MODE, REALTIME_MODE } = await import('./core');
    for (const [b, mode] of [['webgpu', REALTIME_MODE], ['wasm', DEFAULT_MODE]] as const) {
      vi.resetModules();
      cores.length = 0;
      backend = b;
      const send = await loadWorker();
      send({ type: 'init', id: b, source: 'mic' });
      await flush();
      releaseLoad();
      await flush();
      expect(cores[0].options.mode).toEqual(mode);
    }
    vi.unstubAllGlobals();
  });

  it('starts a core from the speaker state it is given, and reports its state on flush', async () => {
    failLoad = false;
    backend = 'wasm';
    const send = await loadWorker();
    const { serializeSpeakerState } = await import('./speaker-state');
    const embeds = new Float32Array(2 * 512).fill(0.25);
    const probs = new Float32Array(2 * 8).fill(0.5);
    const state = serializeSpeakerState({ numFrames: 2, compressed: false, embeds, probs }, { hiddenSize: 512, numSpeakers: 8 });

    send({ type: 'init', id: 'c', source: 'mic', speakerState: state });
    await flush();
    releaseLoad();
    await flush();
    expect(cores[0].options.speakerState?.numFrames).toBe(2);
    expect(Array.from(cores[0].options.speakerState!.embeds)).toEqual(Array.from(embeds));

    coreSnapshot = { numFrames: 2, compressed: false, embeds, probs };
    send({ type: 'flush', id: 'c' });
    await flush();
    expect(posted).toContainEqual({ type: 'flushed', id: 'c', speakerState: state });

    // A core that heard nothing has no state worth keeping.
    coreSnapshot = { numFrames: 0, compressed: false, embeds: new Float32Array(0), probs: new Float32Array(0) };
    posted.length = 0;
    send({ type: 'flush', id: 'c' });
    await flush();
    expect(posted).toEqual([{ type: 'flushed', id: 'c', speakerState: undefined }]);
    vi.unstubAllGlobals();
  });

  it('ignores a speaker state for another model shape', async () => {
    failLoad = false;
    const send = await loadWorker();
    const { serializeSpeakerState } = await import('./speaker-state');
    const state = serializeSpeakerState(
      { numFrames: 1, compressed: false, embeds: new Float32Array(4), probs: new Float32Array(2) },
      { hiddenSize: 4, numSpeakers: 2 },
    );
    send({ type: 'init', id: 'd', source: 'mic', speakerState: state });
    await flush();
    releaseLoad();
    await flush();
    expect(cores[0].options.speakerState).toBeNull();
    vi.unstubAllGlobals();
  });
});
