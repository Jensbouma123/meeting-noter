import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU, PARAKEET_TDT_V3_WEBGPU_FP16 } from '@/lib/asr/browser/model-manifest';
import { voice } from '@/lib/asr/test-signals';
import { lowConfidenceSpans } from './browser-asr';

/**
 * The "Record produces no transcript, and no error" failure, end to end.
 *
 * The bug: `browserASREnabled` defaulted to `false` and `enableBrowserASR()`
 * had no caller anywhere in the app, so every captured frame was dropped by
 * the pipeline's readiness gate — and the engine could never become ready
 * either, because readiness was only reachable *through* the frame handler
 * that was gated on readiness. A session recorded audio indefinitely and
 * produced no segments, no warning, no error: the browser console showed
 * nothing but ORT's "Unknown CPU vendor" / "VerifyEachNodeIsAssignedToAnEp"
 * session-creation noise.
 *
 * These tests pin the three properties that make that impossible again:
 *   1. the engine is on by default and stays on;
 *   2. a frame offered before the model is ready *starts* the model, and the
 *      resulting phase + message are readable (never a silent `false`);
 *   3. every failure path — load, download, inference — ends up as visible
 *      state and a `console.error`, never swallowed.
 *
 * `parakeet.js` itself is replaced with a fake engine (mocked at the module
 * this file's barrel re-exports from) so nothing downloads, and the real ONNX
 * runtime never loads.
 */

const engineState = vi.hoisted(() => ({
  /** Make `ensureLoaded()` reject, to exercise the load-failure path. */
  failLoad: false,
  /**
   * Fail the load for one encoder quantisation only, so the runtime fallback
   * chain can be walked rung by rung (`failLoad` fails every attempt, which
   * would skip straight to the last rung).
   */
  failLoadForEncoder: null as string | null,
  /** Make `transcribe()` report an inference failure. */
  failTranscribe: false,
  /**
   * How many manifest files the fake engine reports reading, and how many
   * load milestones it emits before flipping to ready. The default is "the
   * real thing": every stage, in order.
   */
  load: { files: 3, hold: false } as { files: number; hold: boolean },
  /** Message the fake engine fails with, so failure *shapes* can be tested. */
  failLoadMessage: 'session creation exploded',
  instances: [] as unknown[],
  /** The `encoderQuant` of every engine built, in order — the load path's
   *  actual record of which variants it tried. */
  encoderQuants: [] as (string | undefined)[],
  /** Audio handed to `transcribe()`, one entry per call. */
  transcribed: [] as { samples: number; firstSample: number; source: string; isFinal: boolean }[],
  /** Audio handed to `recognize()` (the live path), one entry per call. */
  recognized: [] as { samples: number; firstSample: number; peak: number }[],
  /** The words `recognize()` answers with, given the window's length (s). */
  words: null as ((seconds: number) => { text: string; start: number; end: number }[]) | null,
  /** While set, `recognize()` waits for it: an inference still running. */
  hold: null as Promise<void> | null,
  /** While set, `ensureLoaded()` waits for it: a load still in flight. */
  loadGate: null as Promise<void> | null,
  /** When set, `transcribe()` reports these words (relative to its audio). */
  transcribeWords: null as { text: string; start: number; end: number }[] | null,
}));

vi.mock('@/lib/asr/browser/parakeet', () => {
  class FakeBrowserASREngine {
    isReady = false;
    constructor(
      public config: unknown,
      public events: {
        onSegment: (seg: unknown) => void;
        onStatusChange: (status: string) => void;
        onError: (message: string) => void;
        onLoadProgress?: (progress: { stage: string; done: number; total: number }) => void;
      },
    ) {
      engineState.instances.push(this);
      engineState.encoderQuants.push((config as { encoderQuant?: string }).encoderQuant);
    }
    async ensureLoaded(): Promise<void> {
      const quant = (this.config as { encoderQuant?: string }).encoderQuant;
      if (engineState.failLoad || quant === engineState.failLoadForEncoder) {
        throw new Error(`${engineState.failLoadMessage} (${quant ?? 'unknown'})`);
      }
      if (engineState.loadGate) await engineState.loadGate;
      for (let done = 0; done <= engineState.load.files; done += 1) {
        this.events.onLoadProgress?.({ stage: 'files', done, total: engineState.load.files });
      }
      this.events.onLoadProgress?.({ stage: 'session', done: 1, total: 1 });
      this.events.onLoadProgress?.({ stage: 'warmup', done: 1, total: 1 });
      this.isReady = true;
    }
    async transcribe(
      audio: Float32Array,
      source: 'mic' | 'system',
      speaker: string,
      isFinal: boolean,
    ): Promise<{ segments: unknown[]; language: null; error: string | null }> {
      engineState.transcribed.push({
        samples: audio.length,
        firstSample: audio.length > 0 ? audio[0] : Number.NaN,
        source,
        isFinal,
      });
      if (engineState.failTranscribe) {
        const message = 'inference exploded';
        this.events.onError(`Browser ASR transcription error: ${message}`);
        return { segments: [], language: null, error: message };
      }
      this.events.onSegment({
        id: `seg-${engineState.transcribed.length}`,
        source,
        speaker,
        text: engineState.transcribeWords ? engineState.transcribeWords.map((w) => w.text).join(' ') : 'hello there',
        start: 0,
        end: 1,
        final: isFinal,
        ...(engineState.transcribeWords ? { words: engineState.transcribeWords } : {}),
      });
      return { segments: [{ id: 'seg-1' }], language: null, error: null };
    }
    async recognize(
      audio: Float32Array,
    ): Promise<{ text: string; words: { text: string; start: number; end: number }[]; error: string | null }> {
      engineState.recognized.push({
        samples: audio.length,
        firstSample: audio.length > 0 ? audio[0] : Number.NaN,
        peak: audio.reduce((m, x) => Math.max(m, Math.abs(x)), 0),
      });
      if (engineState.hold) await engineState.hold;
      if (engineState.failTranscribe) {
        const message = 'inference exploded';
        this.events.onError(`Browser ASR transcription error: ${message}`);
        return { text: '', words: [], error: message };
      }
      const seconds = audio.length / 16_000;
      const words = (engineState.words ?? ((s: number) => [{ text: 'hello', start: 0, end: Math.min(0.5, s) }]))(seconds)
        .filter((w) => w.end <= seconds);
      return { text: words.map((w) => w.text).join(' '), words, error: null };
    }
    /** Mirrors the real engine: a session stop keeps the loaded model (there
     *  is no `release()` in parakeet.js 1.4.4, so rebuilding it per Record is
     *  what piled up hundreds of MB); `disable()` is the real teardown. */
    async stop(): Promise<void> {
      this.isReady = true;
    }
    disable(): void {
      this.isReady = false;
    }
  }
  return { BrowserASREngine: FakeBrowserASREngine };
});

/**
 * Put a manifest's files in the browser cache, by really downloading them.
 *
 * Not by writing store records directly: this app's cache is now its own
 * database of `ArrayBuffer` chunks, and the thing these tests need from it is
 * exactly the thing a hand-written record would fake — that a file the
 * downloader wrote is a file the load path finds. So the real downloader runs
 * against a stubbed network, and a cache that is only half populated (or
 * empty) is a real cache in that state.
 *
 * The stub also answers the repo tree API and `HEAD`s, so the download is
 * size-validated the same way a live one is — including for a self-hosted
 * encoder (no tree entry, measured from its `Content-Length`), which is the
 * only way the q4f16/fp16 variants can be seeded at all. Nothing here reaches
 * the network.
 */
async function seedManifestCache(manifest: {
  modelRepo: string;
  files: readonly string[];
  fileUrlOverrides?: Readonly<Record<string, string>>;
}): Promise<void> {
  const { ensureHfFileCached } = await import('@/lib/asr/browser/resumable-download');
  const content = new Uint8Array(64).map((_, i) => i % 251);
  // A self-hosted file is not in the repo tree — that is exactly why it has an
  // override URL — so the tree lists the rest.
  const hosted = manifest.files.filter((f) => manifest.fileUrlOverrides?.[f] === undefined);

  const stubFetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const file =
      decodeURIComponent(url.split('/resolve/main/')[1] ?? '') || (url.split('/').pop() ?? '');

    if (url.includes('/api/models/')) {
      return new Response(
        JSON.stringify(hosted.map((name) => ({ type: 'file', path: name, size: content.length }))),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (init?.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: { 'content-length': String(content.length), etag: `"${file}"` },
      });
    }
    return new Response(content, { status: 200 });
  });
  // Swap `fetch` by hand rather than with `vi.stubGlobal`: the cleanup would
  // have to be `vi.unstubAllGlobals()`, which also drops the WebGPU
  // `navigator` stub a caller installed before seeding.
  const realFetch = globalThis.fetch;
  globalThis.fetch = stubFetch as unknown as typeof fetch;
  try {
    for (const file of manifest.files) {
      await ensureHfFileCached(manifest.modelRepo, file, 'main', {
        ...(manifest.fileUrlOverrides?.[file] ? { urlOverride: manifest.fileUrlOverrides[file] } : {}),
      });
    }
  } finally {
    globalThis.fetch = realFetch;
  }
}

const WASM_MANIFEST = {
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  files: ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'],
};

/** Put the registry into a known state: speech model cached + consented. */
async function consentAndCache(manifest: {
  modelRepo: string;
  files: readonly string[];
  fileUrlOverrides?: Readonly<Record<string, string>>;
} = WASM_MANIFEST): Promise<void> {
  await seedManifestCache(manifest);
  const registry = await import('@/lib/asr/browser/model-registry');
  registry.markCached('parakeet-ttd');
  registry.recordConsent('accepted', ['parakeet-ttd']);
}

/**
 * A device with a working WebGPU adapter, so backend detection resolves
 * `'webgpu'` (Node has no `navigator.gpu` at all, which is what makes the
 * rest of this file exercise the CPU path).
 *
 * `BroadcastChannel` is stubbed to `undefined` so `withDownloadLock`
 * takes the `if (!channel) return fn(true)` fast path — otherwise each
 * `ensureHfFileCached` waits 350 ms watching for a rival leader that
 * never arrives, and seeding a 3-file manifest costs ~1 s per test.
 */
function stubWebgpuAdapter(): void {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', {
    ...(globalThis.navigator as unknown as Record<string, unknown>),
    gpu: { requestAdapter: async () => ({ isFallbackAdapter: false }) },
  });
}


let consoleError: ReturnType<typeof vi.spyOn>;

/** Empty the model cache.
 *
 * `fake-indexeddb` is one global database for the whole test file and
 * `vi.resetModules()` does not touch its data, so without this a test inherits
 * whatever the previous one seeded — which matters here, because the load path
 * now *verifies* the cache against storage before trusting a `cached` claim.
 * That verification is the behaviour under test, so it needs a known-empty disk.
 */
async function clearModelCache(): Promise<void> {
  const { deleteModelCache } = await import('@/lib/asr/browser/resumable-download');
  await deleteModelCache();
}

beforeEach(async () => {
  engineState.failLoad = false;
  engineState.failLoadForEncoder = null;
  engineState.failTranscribe = false;
  engineState.load = { files: 3, hold: false };
  engineState.failLoadMessage = 'session creation exploded';
  engineState.instances.length = 0;
  engineState.encoderQuants.length = 0;
  engineState.transcribed.length = 0;
  engineState.recognized.length = 0;
  engineState.words = null;
  engineState.transcribeWords = null;
  engineState.hold = null;
  engineState.loadGate = null;
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.resetModules();
  await clearModelCache();
});

afterEach(() => {
  consoleError.mockRestore();
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** Import the module under test and put the registry into a known state. */
async function loadBrowserAsr() {
  const mod = await import('./browser-asr');
  // `registerDefaultModels` is what a real page does on mount (backend
  // detection resolves to 'wasm' under Node — no `navigator.gpu`).
  mod.registerDefaultModels('wasm');
  return mod;
}

/**
 * A device with a working WebGPU adapter, so backend detection resolves
 * `'webgpu'` (Node has no `navigator.gpu` at all, which is what makes the
 * rest of this file exercise the CPU path).
 *
 * The q4f16 files are seeded before `registerDefaultModels`, because that
 * call runs `ensureHfFileCached` for the registry entry and would otherwise
 * hit the real network.
 */
async function loadWebgpuAsr(): Promise<typeof import('./browser-asr')> {
  stubWebgpuAdapter();
  await seedManifestCache(PARAKEET_TDT_V3_WEBGPU);
  const mod = await import('./browser-asr');
  mod.registerDefaultModels('webgpu');
  const registry = await import('@/lib/asr/browser/model-registry');
  registry.markCached('parakeet-ttd');
  registry.recordConsent('accepted', ['parakeet-ttd']);
  return mod;
}

describe('browser ASR is reachable', () => {
  it('is enabled by default — nothing has to switch it on for Record to work', async () => {
    const asr = await loadBrowserAsr();
    expect(asr.getBrowserASREnabled()).toBe(true);
    expect(asr.getBrowserASRPhase()).not.toBe('disabled');
  });

  it('transcribes once the model is ready, so frames reach the transcript', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    const { getState } = await import('./store');

    // Frame one: starts the model (nothing is ready yet) — this is the call
    // the old readiness gate made unreachable.
    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(false);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('ready');

    // Frame two: goes through to a segment in the store.
    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(true);
    expect(getState().segments.map((s) => s.text)).toEqual(['hello there']);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('a model that cannot be used is visible, not silent', () => {
  it('reports a blocked phase with an actionable message when consent is missing', async () => {
    const asr = await loadBrowserAsr();

    // No consent, nothing cached: recording continues but nothing transcribes.
    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(false);
    await asr.ensureBrowserASRReady();

    expect(asr.getBrowserASRPhase()).toBe('blocked');
    const message = asr.getBrowserASRStatusMessage();
    expect(message).toMatch(/not been downloaded/i);
    // The engine must NOT have been instantiated — there is nothing to load.
    expect(engineState.instances).toHaveLength(0);
  });

  it('does not re-notify subscribers for every dropped frame while blocked', async () => {
    const asr = await loadBrowserAsr();
    let notifications = 0;
    const unsubscribe = asr.subscribeBrowserASR(() => {
      notifications += 1;
    });

    // The capture pipeline offers ~10-20 frames/s; an unconditional notify
    // here would re-render every subscriber at capture rate for a state that
    // never changed.
    for (let i = 0; i < 5; i += 1) {
      await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false);
    }
    await asr.ensureBrowserASRReady();

    expect(asr.getBrowserASRPhase()).toBe('blocked');
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it('surfaces a load failure as failed state with the underlying message, and logs it', async () => {
    engineState.failLoad = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();

    expect(await asr.ensureBrowserASRReady()).toBe(false);

    expect(asr.getBrowserASRPhase()).toBe('failed');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/session creation exploded/);
    expect(consoleError).toHaveBeenCalled();
  });

  it('surfaces an inference failure instead of silently dropping every later frame', async () => {
    engineState.failTranscribe = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();

    expect(await asr.tryBrowserASR(new Float32Array([0.1]), 'mic', false)).toBe(false);
    // The engine reported it through `onError`, so the phase and the message
    // both have to reflect it — this used to be an empty `catch {}` that
    // quietly disabled the engine with nothing shown and nothing logged.
    expect(asr.getBrowserASRPhase()).toBe('failed');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/inference exploded/);
    expect(consoleError).toHaveBeenCalled();
  });
});

/**
 * "Press Record and nothing happens for a minute" — the failure this progress
 * reporting exists for. The user must be able to watch the model get ready,
 * and every number they see has to be a measurement rather than a timer.
 */
describe('model preparation progress', () => {
  it('walks a real percentage through initialization and lands on 100 = ready', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();

    const seen: Array<{ phase: string; percent: number | null; label: string | null }> = [];
    const unsubscribe = asr.subscribeBrowserASR(() => {
      const p = asr.getBrowserASRProgress();
      seen.push({ phase: p.phase, percent: p.percent, label: p.label });
    });

    // Before anything is asked for, there is no progress to report at all —
    // not a fake 0%.
    expect(asr.getBrowserASRProgress().percent).toBeNull();

    await asr.ensureBrowserASRReady();

    const loading = seen.filter((s) => s.phase === 'loading');
    expect(loading.length).toBeGreaterThan(1);
    // Every value is a real, distinct milestone…
    const percents = [...new Set(loading.flatMap((s) => (s.percent === null ? [] : [s.percent])))];
    expect(percents.length).toBeGreaterThan(2);
    // …strictly increasing…
    for (let i = 1; i < percents.length; i += 1) {
      expect(percents[i]).toBeGreaterThan(percents[i - 1]);
    }
    // …never 100: that is `ready`, and nothing else may claim it.
    expect(Math.max(...percents)).toBeLessThan(100);
    // And every moment of preparation names the stage, determinate or not.
    expect(loading.every((s) => s.label?.startsWith('Initializing model'))).toBe(true);

    // The end state is 100% and `ready`, which is what the UI hides behind.
    const done = asr.getBrowserASRProgress();
    expect(done.phase).toBe('ready');
    expect(done.percent).toBe(100);
    expect(done.stage).toBeNull();
    expect(done.label).toBeNull();
    unsubscribe();
  });

  it('is indeterminate, with the stage named, when the engine reports no file list', async () => {
    // A config with no file list makes the file stage uncountable. A bar that
    // has to invent a fill would be a lie, so this must be `null` + a label.
    engineState.load = { files: 0, hold: false };
    const asr = await loadBrowserAsr();
    await consentAndCache();
    const seen: Array<{ percent: number | null; detail: string | null }> = [];
    const unsubscribe = asr.subscribeBrowserASR(() => {
      const p = asr.getBrowserASRProgress();
      if (p.phase === 'loading') seen.push({ percent: p.percent, detail: p.detail });
    });

    await asr.ensureBrowserASRReady();

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.some((s) => s.percent === null && s.detail !== null)).toBe(true);
    unsubscribe();
  });

  it('reports the download as real bytes, and stops reporting it once cached', async () => {
    const asr = await loadBrowserAsr();
    const registry = await import('@/lib/asr/browser/model-registry');
    registry.recordConsent('accepted', ['parakeet-ttd']);
    const entry = registry.getModelStatus('parakeet-ttd');
    expect(entry).toBeDefined();

    // What `_doDownload` writes on every chunk.
    entry!.status = 'downloading';
    registry.updateProgress('parakeet-ttd', 512, 1024, 'encoder-model.int8.onnx', 0, 0);

    const downloading = asr.getBrowserASRProgress();
    expect(downloading.phase).toBe('downloading');
    expect(downloading.stage).toBe('downloading');
    expect(downloading.percent).toBe(50);
    expect(downloading.label).toBe('Downloading model 50%');

    // A resume is "setting up", not "stuck at 50%" — no percentage at all.
    registry.updateProgress('parakeet-ttd', 512, 1024, 'encoder-model.int8.onnx', 0, 0, true);
    const resuming = asr.getBrowserASRProgress();
    expect(resuming.percent).toBeNull();
    expect(resuming.label).toBe('Downloading model');
    expect(resuming.detail).toBe('Resuming download');

    // Download done: the bar hands over to the initialization half, and the
    // stale download percentage is gone with it.
    registry.updateProgress('parakeet-ttd', 1024, 1024, '', 0, 0);
    registry.markCached('parakeet-ttd');
    expect(asr.getBrowserASRProgress().stage).not.toBe('downloading');
  });

  it('hands out a stable snapshot between changes, and a fresh one when a stage lands', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();

    const before = asr.getBrowserASRProgress();
    expect(asr.getBrowserASRProgress()).toBe(before);

    const snapshots: unknown[] = [];
    const unsubscribe = asr.subscribeBrowserASR(() => {
      snapshots.push(asr.getBrowserASRProgress());
    });
    await asr.ensureBrowserASRReady();
    unsubscribe();

    // Every notification carried a new object (so `useSyncExternalStore`
    // re-renders), and no two of them were ever the same reference.
    expect(snapshots.length).toBeGreaterThan(2);
    for (let i = 1; i < snapshots.length; i += 1) {
      expect(snapshots[i]).not.toBe(snapshots[i - 1]);
    }
  });

  it('never lets a retry inherit the previous attempt’s progress', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();
    expect(asr.getBrowserASRProgress().percent).toBe(100);

    asr.resetBrowserASR();

    // A stale "warm-up done" here would show 100% for a load that is about to
    // start from nothing.
    const afterReset = asr.getBrowserASRProgress();
    expect(afterReset.phase).not.toBe('ready');
    expect(afterReset.percent).toBeNull();
    expect(afterReset.stage).toBeNull();
  });

  it('drops the percentage on a failure, keeping the error message', async () => {
    engineState.failLoad = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();

    const failed = asr.getBrowserASRProgress();
    expect(failed.phase).toBe('failed');
    expect(failed.percent).toBeNull();
    expect(failed.stage).toBeNull();
    expect(asr.getBrowserASRStatusMessage()).toMatch(/session creation exploded/);
  });

  it('explains an out-of-memory load failure instead of surfacing the raw allocator text', async () => {
    // Safari's version of this is a killed WebContent process and a tab that
    // reloads with "This webpage was reloaded because a problem occurred" —
    // nothing survives for the user to read. Where the allocation failure *is*
    // reported, the message has to name the cause and the remedy.
    engineState.failLoadMessage = 'Array buffer allocation failed';
    engineState.failLoad = true;
    const asr = await loadBrowserAsr();
    await consentAndCache();

    await asr.ensureBrowserASRReady();

    expect(asr.getBrowserASRPhase()).toBe('failed');
    const message = asr.getBrowserASRStatusMessage() ?? '';
    expect(message).toMatch(/ran out of memory/i);
    expect(message).toMatch(/CPU-only/);
    expect(consoleError).toHaveBeenCalled();
  });

  it('keeps one loaded model across recordings instead of rebuilding it', async () => {
    // The Safari tab crash: every Record -> stop -> Record used to build a new
    // copy of a ~670 MB model while the previous one was still awaiting GC, and
    // `parakeet.js` has no `release()` to make that deterministic.
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.ensureBrowserASRReady();
    expect(engineState.instances).toHaveLength(1);

    asr.resetBrowserASR();

    // …and the page's own view has to recover, or Record stays disabled with a
    // perfectly good model sitting right there.
    expect(asr.getBrowserASRPhase()).not.toBe('ready');
    // The next explicit Record (or warm) reconciles with the kept engine instead of
    // building a second copy while the first is still alive.
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('ready');
    expect(engineState.instances).toHaveLength(1);
  });

  it('has a frozen server snapshot, so hydration cannot mismatch', async () => {
    const asr = await loadBrowserAsr();
    const server = asr.getServerBrowserASRProgress();
    expect(server).toBe(asr.getServerBrowserASRProgress());
    expect(Object.isFrozen(server)).toBe(true);
    expect(server.phase).toBe('idle');
    expect(server.percent).toBeNull();
  });
});

/**
 * A model load that killed the tab — Safari's "a problem repeatedly occurred".
 *
 * A killed WebContent process runs no further JavaScript, so the only signal
 * that survives is a marker the load set and never cleared. Boot must read
 * that marker as "the previous load crashed" (blocked + message, never a
 * fresh auto-load), and the retry must switch to the smaller model. The
 * marker lives in `sessionStorage` here via a stub — Node has none — and it
 * must be stubbed *before* the module import, because the module reads it at
 * load time.
 */
describe('a model load that killed the tab', () => {
  const MARKER = 'mn.asr-load-in-progress.v1';

  function stubSessionStorage(initial: Record<string, string> = {}): Map<string, string> {
    const store = new Map(Object.entries(initial));
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
    return store;
  }

  it('boots blocked with a crash message instead of auto-loading again', async () => {
    stubSessionStorage({ [MARKER]: String(Date.now()) });
    const asr = await import('./browser-asr');
    asr.registerDefaultModels('wasm');

    expect(asr.didPreviousModelLoadCrash()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('blocked');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/previous model load crashed the tab/i);
    // Nothing auto-started: no engine built, and the warm refuses to build
    // one either — the loop this guard exists to break.
    expect(engineState.instances).toHaveLength(0);
    asr.warmBrowserASR();
    expect(engineState.instances).toHaveLength(0);
  });

  it('retries a crashed load with the smaller model and re-opens consent', async () => {
    const store = stubSessionStorage({ [MARKER]: String(Date.now()) });
    const asr = await import('./browser-asr');
    asr.registerDefaultModels('wasm');
    expect(asr.didPreviousModelLoadCrash()).toBe(true);

    asr.retryCrashedLoadWithSmallerModel();

    expect(asr.didPreviousModelLoadCrash()).toBe(false);
    expect(store.has(MARKER)).toBe(false);
    const registry = await import('@/lib/asr/browser/model-registry');
    expect(registry.getState().activeBackend).toBe('wasm');
    // The consent on file was for the crashed variant's files/size, so it
    // must be asked again rather than silently pulling another download.
    expect(registry.hasNeverBeenPrompted()).toBe(true);
    expect(registry.getState().dialogVisible).toBe(true);
  });

  it('still loads on Record after a crash — the guard blocks auto-load, not explicit action', async () => {
    stubSessionStorage({ [MARKER]: String(Date.now()) });
    const asr = await import('./browser-asr');
    asr.registerDefaultModels('wasm');
    await consentAndCache();

    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(asr.didPreviousModelLoadCrash()).toBe(false);
    expect(asr.getBrowserASRPhase()).toBe('ready');
  });

  it('clears the in-flight marker once a load settles', async () => {
    const store = stubSessionStorage();
    const asr = await import('./browser-asr');
    asr.registerDefaultModels('wasm');
    await consentAndCache();

    await asr.ensureBrowserASRReady();

    // Set when the load started, cleared when it settled: a marker found at
    // boot can only mean the tab died in between.
    expect(store.has(MARKER)).toBe(false);
  });

  /** A page `window` whose listeners the test can fire. */
  function stubWindow(): (type: string, ev?: object) => void {
    const listeners = new Map<string, ((ev: object) => void)[]>();
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: (ev: object) => void) => {
        listeners.set(type, [...(listeners.get(type) ?? []), fn]);
      },
    });
    return (type, ev = {}) => listeners.get(type)?.forEach((fn) => fn(ev));
  }

  it('a reload mid-load clears the marker, so the next page is not blocked', async () => {
    const store = stubSessionStorage();
    const fire = stubWindow();
    let release = () => {};
    engineState.loadGate = new Promise<void>((resolve) => (release = resolve));
    const asr = await import('./browser-asr');
    asr.registerDefaultModels('wasm');
    await consentAndCache();

    const loading = asr.ensureBrowserASRReady();
    await vi.waitFor(() => expect(store.has(MARKER)).toBe(true));
    fire('pagehide', { persisted: false });
    expect(store.has(MARKER)).toBe(false);

    vi.resetModules();
    const next = await import('./browser-asr');
    expect(next.didPreviousModelLoadCrash()).toBe(false);
    release();
    await loading;
  });

  it('a reload of the page a crash blocked stays blocked', async () => {
    const store = stubSessionStorage({ [MARKER]: String(Date.now()) });
    const fire = stubWindow();
    const asr = await import('./browser-asr');
    expect(asr.didPreviousModelLoadCrash()).toBe(true);

    // The marker is the previous page's crash, not a load this page started.
    fire('pagehide', { persisted: false });
    expect(store.has(MARKER)).toBe(true);

    vi.resetModules();
    const next = await import('./browser-asr');
    expect(next.didPreviousModelLoadCrash()).toBe(true);
  });

  it('a marker too old to be the crash loop does not block', async () => {
    const store = stubSessionStorage({ [MARKER]: String(Date.now() - 60 * 60 * 1000) });
    const asr = await import('./browser-asr');

    expect(asr.didPreviousModelLoadCrash()).toBe(false);
    expect(store.has(MARKER)).toBe(false);
  });

  it('builds the engine once the files are cached, so Record is not stuck behind "Preparing model"', async () => {
    stubSessionStorage();
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    asr.warmBrowserASR();
    // The warm and an explicit Record share one load, never two engines.
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(engineState.instances).toHaveLength(1);
    expect(asr.getBrowserASRPhase()).toBe('ready');
  });
});
/**
 * The state that produced the reported failure, end to end.
 *
 * `cached` in the registry is a `localStorage` claim, and this is the path the
 * app took on believing a claim that had stopped being true — which is exactly
 * what happens when the user clears `parakeet-cache-db` from the console to
 * reclaim a multi-gigabyte download, or when Safari evicts it:
 *
 *   - the entry claimed `cached`, so `initiateDownloads()` filtered it out and
 *     the consent dialog's Download button genuinely started nothing;
 *   - the settings panel said "Ready" and Record read as enabled;
 *   - `getParakeetModel()` then found no cached bytes and quietly re-fetched
 *     the whole model, one un-reported `fetch` at a time, so the preparation
 *     bar sat on the last stage it had genuinely reached — "Initializing model
 *     35%", the file-probe weight — with nothing moving and no error.
 *
 * The load path now asks the storage instead of the claim, and takes the claim
 * back when the bytes are not there.
 */
describe('a cached claim the storage no longer backs', () => {
  it('re-downloads instead of silently loading a model that is not there', async () => {
    const asr = await loadBrowserAsr();
    const registry = await import('@/lib/asr/browser/model-registry');
    // Consent is on file and the entry *claims* to be cached, but nothing has
    // been written to IndexedDB — the state after `deleteDatabase(...)`.
    registry.recordConsent('accepted', ['parakeet-ttd']);
    registry.markCached('parakeet-ttd');
    expect(registry.getModelStatus('parakeet-ttd')!.status).toBe('cached');

    // A real attempt at the download, stubbed to fail fast and offline: what
    // matters is which branch the load took, not what the network said.
    const fetchStub = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchStub);

    const ready = await asr.ensureBrowserASRReady();

    // The claim is gone…
    expect(registry.getModelStatus('parakeet-ttd')!.status).not.toBe('cached');
    // …a download was actually attempted (it was filtered out before)…
    expect(fetchStub).toHaveBeenCalled();
    // …and the fake engine was never built, because there were no files to
    // build it from.
    expect(engineState.instances).toHaveLength(0);
    expect(ready).toBe(false);
    vi.unstubAllGlobals();
  });

  it('trusts the claim when the bytes really are there', async () => {
    // The other half of the same guard: verifying must not turn every warm-up
    // into a re-download, which is the expensive mistake in the other
    // direction.
    const asr = await loadBrowserAsr();
    await consentAndCache();
    const fetchStub = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchStub);

    expect(await asr.ensureBrowserASRReady()).toBe(true);

    expect(fetchStub).not.toHaveBeenCalled();
    expect(engineState.instances).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

/**
 * The runtime fallback chain: q4f16 → fp16 on WebGPU, then the CPU model.
 *
 * This is the recovery policy for the one thing detection cannot see — an
 * adapter that exists but cannot produce a session (driver denylist, context
 * loss, out of GPU memory). It matters because the two rungs are different
 * files with different sizes, and getting the order wrong costs a user either a
 * 1.24 GB download they did not need, or a device with no GPU transcription at
 * all.
 */
describe('the encoder fallback chain', () => {
  it('drops from q4f16 to fp16 — still on the GPU — when the q4f16 session fails', async () => {
    engineState.failLoadForEncoder = 'q4f16';
    const asr = await loadWebgpuAsr();
    const { detectAsrBackend } = await import('@/lib/asr/browser');
    const registry = await import('@/lib/asr/browser/model-registry');
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    // First attempt: the default encoder, which cannot create a session.
    const ready1 = await asr.ensureBrowserASRReady();
    expect(ready1).toBe(false);
    expect(engineState.encoderQuants).toEqual(['q4f16']);
    expect(asr.getBrowserASRStatusMessage()).toMatch(/FP16/i);

    // The consent on file was for the q4f16 files; the next rung is a 1.24 GB
    // download the user has to confirm, and the entry has to describe it.
    expect(registry.hasNeverBeenPrompted()).toBe(true);
    expect(registry.getState().dialogVisible).toBe(true);
    expect(registry.getModelStatus('parakeet-ttd')?.variant).toBe('webgpu-fp16');
    expect(registry.getModelStatus('parakeet-ttd')?.estimatedSizeBytes).toBe(1_257_541_902);
    // Still WebGPU — a working GPU must not be given up on one rung down.
    expect(await detectAsrBackend()).toBe('webgpu');

    // Second attempt: the fp16 rung, after the user consents to it.
    // The failure path registered fp16 as the active WebGPU manifest,
    // so consent must cover its files.
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU_FP16);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    expect(engineState.encoderQuants).toEqual(['q4f16', 'fp16']);
    expect(asr.getBrowserASRPhase()).toBe('ready');
  });

  it('falls to the CPU model only after every WebGPU encoder has failed', async () => {
    engineState.failLoad = true;
    const asr = await loadWebgpuAsr();
    const { detectAsrBackend } = await import('@/lib/asr/browser');
    const registry = await import('@/lib/asr/browser/model-registry');
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    await asr.ensureBrowserASRReady();
    // One rung down…
    expect(engineState.encoderQuants).toEqual(['q4f16']);
    expect(registry.getModelStatus('parakeet-ttd')?.variant).toBe('webgpu-fp16');
    expect(await detectAsrBackend()).toBe('webgpu');

    // The consent is for the fp16 rung's files: the download manager fetches
    // the entry's own variant, not the first rung of its backend.
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU_FP16);
    await asr.ensureBrowserASRReady();
    // …and only then the CPU one, which is not a live path at all.
    expect(engineState.encoderQuants).toEqual(['q4f16', 'fp16']);
    // The CPU model is a different file that loads fine — the failures above
    // were the WebGPU encoders' sessions, not the device's.
    engineState.failLoad = false;
    await consentAndCache();
    await asr.ensureBrowserASRReady();
    expect(engineState.encoderQuants).toEqual(['q4f16', 'fp16', 'int8']);
    expect(await detectAsrBackend()).toBe('wasm');
    expect(registry.getModelStatus('parakeet-ttd')?.variant).toBe('wasm-int8');
    expect(asr.getBrowserASRStatusMessage()).toMatch(/transcribed after you stop/i);
    expect(consoleError).toHaveBeenCalled();
  });

  it('does not walk the chain at all when the first rung works', async () => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);

    expect(await asr.ensureBrowserASRReady()).toBe(true);

    // One engine, one variant, and the live path is in charge — the exact
    // thing a chain that "helpfully" pre-loaded the fp16 file would break.
    expect(engineState.encoderQuants).toEqual(['q4f16']);
    expect(asr.getBrowserASRPhase()).toBe('ready');
    expect(asr.shouldBufferForPostStop()).toBe(false);
    expect(asr.isPostStopTranscriptionOnly()).toBe(false);
  });

});

/**
 * The CPU model, used the only way it can be.
 *
 * §3 measured it at RTF 1.41 — 1.41 s of compute per second of audio — so it
 * cannot transcribe a live stream; it transcribes the finished recording. The
 * properties pinned here are the ones that decide whether a user gets their
 * meeting back: the frames are really buffered, the audio handed to the model
 * is the audio that was captured (in the right scale), the work is cut into
 * windows with a real percentage, and every window's text reaches the store.
 */
describe('post-stop transcription on a CPU-only device', () => {
  /** One 100 ms worklet frame of Int16 @ 16 kHz, at +0.5 full scale. */
  function frame(value = 16384): ArrayBuffer {
    return Int16Array.from({ length: 1600 }, () => value).buffer;
  }

  async function loadPostStopAsr() {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    // `loadBrowserAsr` registers WASM because Node has no `navigator.gpu`,
    // which is the post-stop case under test.
    await asr.resolveAsrBackend();
    return asr;
  }

  it('says live transcription is not supported, and still records', async () => {
    const asr = await loadPostStopAsr();

    expect(asr.isPostStopTranscriptionOnly()).toBe(true);
    expect(asr.shouldBufferForPostStop()).toBe(true);
    expect(asr.getBrowserASRPhase()).toBe('post-stop');
    expect(asr.getBrowserASRStatusMessage()).toBe(
      'Live transcription is not supported on this device - the recording will be transcribed after you stop',
    );

    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 5; i += 1) asr.bufferRecordedAudio('mic', frame());
    const { bufferedSeconds } = await import('./post-stop-buffer');
    expect(bufferedSeconds().mic).toBeCloseTo(0.5, 5);
  });

  it('transcribes the buffered recording on Stop, with real progress and real audio', async () => {
    const asr = await loadPostStopAsr();
    const { getState } = await import('./store');
    const { getPostStopTranscriptionProgress } = asr;

    asr.beginRecordedAudioCapture();
    // 65 s of audio: two 60 s windows, so the chunking and the percentage are
    // both exercised rather than assumed.
    for (let i = 0; i < 650; i += 1) asr.bufferRecordedAudio('mic', frame());

    const seen: number[] = [];
    const unsubscribe = asr.subscribePostStopTranscription(() => {
      const p = getPostStopTranscriptionProgress();
      if (p?.percent !== null && p?.percent !== undefined) seen.push(p.percent);
    });

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    unsubscribe();

    // The model was loaded on demand (nothing was built at Record time) and
    // the whole recording went through it, window by window.
    expect(engineState.encoderQuants).toEqual(['int8']);
    expect(engineState.transcribed).toHaveLength(2);
    expect(engineState.transcribed.every((t) => t.isFinal)).toBe(true);
    // …in the amplitude the model expects: Int16 16384 is +0.5, not a
    // reinterpreted bit pattern (which is what a Float32 *view* of the same
    // buffer would have produced — about 2e-41).
    expect(engineState.transcribed[0].firstSample).toBeCloseTo(0.5, 5);
    // Window 1 is the first 60 s (no context before it to carry in); window 2
    // is the remaining 5 s plus the 0.5 s of overlap that lets its decoder
    // hear the word the boundary cut: 5.5 s.
    expect(engineState.transcribed[0].samples).toBe(60 * 16_000);
    expect(engineState.transcribed[1].samples).toBe(Math.round(5.5 * 16_000));

    // Real progress: 0, then a real mid-point, then done — and the text of
    // every window reached the transcript.
    expect(seen).toContain(0);
    expect(seen).toContain(50);
    expect(seen).toContain(100);
    const progress = getPostStopTranscriptionProgress();
    expect(progress?.phase).toBe('done');
    expect(progress?.chunksTotal).toBe(2);
    expect(getState().segments.filter((s) => s.final)).toHaveLength(2);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('releases the buffer after transcribing, so a stop cannot duplicate a transcript', async () => {
    const asr = await loadPostStopAsr();
    const { bufferedSeconds } = await import('./post-stop-buffer');

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame());
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    expect(bufferedSeconds().mic).toBeUndefined();

    // A second Stop with nothing buffered is a no-op that succeeds (nothing
    // was left to do), not an error and not a re-transcription of the same
    // audio.
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    expect(engineState.transcribed).toHaveLength(1);
  });

  it('keeps each source separate, so a two-source recording is not one voice', async () => {
    const asr = await loadPostStopAsr();

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame(16384));
    asr.bufferRecordedAudio('system', frame(-16384));

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);

    // One call per source, with that source's own amplitude — interleaving
    // them into one waveform would produce one speaker talking over itself.
    expect(engineState.transcribed.map((t) => t.source)).toEqual(['mic', 'system']);
    expect(engineState.transcribed[0].firstSample).toBeCloseTo(0.5, 5);
    expect(engineState.transcribed[1].firstSample).toBeCloseTo(-0.5, 5);
  });

  it('does not transcribe anything, or claim to, when no audio was recorded', async () => {
    const asr = await loadPostStopAsr();

    asr.beginRecordedAudioCapture();
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);

    // No engine was built for an empty recording: an empty inference costs a
    // full encoder pass and produces nothing.
    expect(engineState.instances).toHaveLength(0);
    expect(asr.getPostStopTranscriptionProgress()?.phase).toBe('done');
  });

  it('reports a failure instead of losing the transcript silently', async () => {
    const asr = await loadPostStopAsr();
    engineState.failTranscribe = true;

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame());

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(false);
    expect(asr.getPostStopTranscriptionProgress()?.phase).toBe('error');
    expect(consoleError).toHaveBeenCalled();
  });

  it('drops the buffered audio when the model cannot load', async () => {
    const asr = await loadPostStopAsr();
    engineState.failLoad = true;

    asr.beginRecordedAudioCapture();
    asr.bufferRecordedAudio('mic', frame());
    const { hasBufferedAudio } = await import('./post-stop-buffer');
    expect(hasBufferedAudio()).toBe(true);

    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(false);
    expect(hasBufferedAudio()).toBe(false);
  });
});

/**
 * Each recording decides once whether it transcribes live or after Stop, and
 * frames captured before the backend probe answers follow that decision.
 */
describe('the transcription mode of a recording', () => {
  function frame(value = 16384): ArrayBuffer {
    return Int16Array.from({ length: 1600 }, () => value).buffer;
  }

  it('sends frames held before the probe answered to the live path on a WebGPU device', async () => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    const { bufferedSeconds } = await import('./post-stop-buffer');

    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 5; i += 1) asr.bufferRecordedAudio('mic', frame(), i * 1600);
    expect(asr.getRecordingTranscriptionMode()).toBeNull();
    expect(engineState.instances).toHaveLength(0);

    expect(await asr.resolveAsrBackend()).toBe('webgpu');

    expect(asr.getRecordingTranscriptionMode()).toBe('live');
    // Not left in a buffer nothing on this device ever transcribes...
    expect(bufferedSeconds().mic ?? 0).toBe(0);
    // ...but replayed live, which is what starts the model.
    await vi.waitFor(() => expect(engineState.instances).toHaveLength(1));
  });

  it('keeps a live recording live on Stop after the device fell to the CPU model', async () => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    asr.beginRecordedAudioCapture();
    expect(asr.getRecordingTranscriptionMode()).toBe('live');

    asr.retryCrashedLoadWithSmallerModel();
    await asr.resolveAsrBackend();
    expect(asr.isPostStopTranscriptionOnly()).toBe(true);

    asr.bufferRecordedAudio('mic', frame());
    expect(asr.getRecordingTranscriptionMode()).toBe('live');
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(false);
    expect(engineState.transcribed).toHaveLength(0);
  });
});

describe('post-stop transcription with speaker turns', () => {
  it('cuts a window where the speaker changes and labels each part from its own span', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.resolveAsrBackend();
    const { getState, resetSession } = await import('./store');
    resetSession('system');
    asr.setSpeakerTimeline({
      speakerFor: (_source, start, end) => ((start + end) / 2 < 20 ? 'system:0' : 'system:1'),
      speakerNear: (_source, start, end) => ((start + end) / 2 < 20 ? 'system:0' : 'system:1'),
      changePoints: (_source, start, end) => [20].filter((t) => t > start && t < end),
      turnEnds: () => [],
    });

    asr.beginRecordedAudioCapture();
    // 30 s: one window, with the change 20 s in.
    for (let i = 0; i < 300; i += 1) {
      asr.bufferRecordedAudio('system', Int16Array.from({ length: 1600 }, () => 8192).buffer);
    }
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);

    expect(engineState.transcribed.map((t) => t.samples)).toEqual([20 * 16_000, 10 * 16_000]);
    expect(getState().segments.map((seg) => [seg.start, seg.end, seg.speaker])).toEqual([
      [0, 20, 'system:0'],
      [20, 30, 'system:1'],
    ]);
  });
});

describe('post-stop words', () => {
  it('splits a part per word where the speaker changes inside it', async () => {
    const asr = await loadBrowserAsr();
    await consentAndCache();
    await asr.resolveAsrBackend();
    const { getState, resetSession } = await import('./store');
    resetSession('system');
    engineState.transcribeWords = [
      { text: 'one', start: 1, end: 2 },
      { text: 'two', start: 3, end: 4 },
      { text: 'three', start: 12, end: 13 },
    ];
    const at = (start: number, end: number) => ((start + end) / 2 < 10 ? 'system:0' : 'system:1');
    asr.setSpeakerTimeline({
      speakerFor: (_source, start, end) => at(start, end),
      speakerNear: (_source, start, end) => at(start, end),
      changePoints: () => [],
      turnEnds: () => [],
    });
    asr.beginRecordedAudioCapture();
    for (let i = 0; i < 300; i += 1) {
      asr.bufferRecordedAudio('system', Int16Array.from({ length: 1600 }, () => 8192).buffer);
    }
    expect(await asr.transcribeRecordedAudioAfterStop()).toBe(true);
    engineState.transcribeWords = null;
    expect(getState().segments.map((seg) => [seg.text, seg.speaker])).toEqual([
      ['one two', 'system:0'],
      ['three', 'system:1'],
    ]);
  });
});

describe('live audio windows', () => {
  /** 100 ms of Int16 PCM at 16 kHz: frame `index` of a steady voice at RMS
   *  `level`. A constant level is not speech to the gate (`speech-gate.ts`). */
  function speech(index: number, level = 0.3): ArrayBuffer {
    return Int16Array.from(voice(1600, level, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }
  /** 100 ms of digital silence. */
  function silence(): ArrayBuffer {
    return new Int16Array(1600).buffer;
  }
  /** The largest sample of `pcm`, as the Float32 the model must be handed. */
  function peakOf(frames: ArrayBuffer[]): number {
    return frames.reduce((m, f) => new Int16Array(f).reduce((n, x) => Math.max(n, Math.abs(x) / 32768), m), 0);
  }

  async function readyWebgpuAsr() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = await import('./store');
    store.resetSession('both');
    return { asr, store };
  }

  it('batches 100 ms frames into windows of correctly scaled Float32: a fast first take, then 1.5 s steps', async () => {
    const { asr } = await readyWebgpuAsr();

    const frames = Array.from({ length: 30 }, (_, i) => speech(i));
    let n = 0;
    // The first take fires as soon as the gate opens (0.3 s of voice), well before 1.5 s.
    while (engineState.recognized.length === 0 && n < 14) asr.pushLiveAudio('mic', frames[n++]);
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));
    expect(n).toBeLessThan(15);
    expect(engineState.recognized[0].samples).toBe(n * 1600);
    // Int16 is scaled by 1/32768 — not the NaN/garbage a Float32 *view* produces.
    expect(peakOf(frames)).toBeGreaterThan(0.3);
    expect(engineState.recognized[0].peak).toBeCloseTo(peakOf(frames.slice(0, n)), 5);

    // The next take waits for a full 1.5 s of new audio.
    const first = n;
    for (; n < first + 14; n += 1) asr.pushLiveAudio('mic', frames[n]);
    await new Promise((r) => setTimeout(r, 20));
    expect(engineState.recognized).toHaveLength(1);
    asr.pushLiveAudio('mic', frames[n]);
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));
    expect(engineState.recognized[1].samples).toBe((first + 15) * 1600);
  });

  it('never sends silence to the model', async () => {
    const { asr, store } = await readyWebgpuAsr();
    for (let i = 0; i < 100; i += 1) asr.pushLiveAudio('mic', silence());
    await asr.flushLiveAudio();
    expect(engineState.recognized).toHaveLength(0);
    expect(store.getState().segments).toEqual([]);
  });

  it('re-reads the open utterance, updating one segment instead of adding fragments', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = (s) => [
      { text: 'hello', start: 0.1, end: 0.6 },
      { text: 'there', start: 1.4, end: 2.0 },
    ].filter((w) => w.end <= s);

    for (let i = 0; i < 30; i += 1) asr.pushLiveAudio('mic', speech(i));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));
    // The second window starts where the first did and holds both.
    expect(engineState.recognized[1].samples).toBe(30 * 1600);
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello there', false]]);
  });

  it('closes the segment at a pause and flushes the tail on Stop', async () => {
    const { asr, store } = await readyWebgpuAsr();

    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    for (let i = 0; i < 7; i += 1) asr.pushLiveAudio('mic', silence());
    await vi.waitFor(() => expect(store.getState().segments.filter((s) => s.final)).toHaveLength(1));

    // A short last reply, just past the ~300 ms an utterance needs to open.
    for (let i = 0; i < 5; i += 1) asr.pushLiveAudio('mic', speech(i, 0.15));
    await asr.flushLiveAudio();
    const segments = store.getState().segments;
    expect(segments.map((s) => [s.text, s.final])).toEqual([
      ['hello', true],
      ['hello', true],
    ]);
    expect(engineState.recognized.at(-1)?.samples).toBeGreaterThanOrEqual(5 * 1600);
  });

  it('turns an empty or punctuation-only result into no segment at all', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = () => [{ text: '.', start: 0.1, end: 0.2 }];
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    for (let i = 0; i < 7; i += 1) asr.pushLiveAudio('mic', silence());
    await asr.flushLiveAudio();
    expect(engineState.recognized.length).toBeGreaterThan(0);
    expect(store.getState().segments).toEqual([]);
  });

  it('serves both sources, and tags each segment with the source it came from', async () => {
    const { asr, store } = await readyWebgpuAsr();
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));

    // The mic's window goes first and holds the engine; call audio keeps
    // arriving meanwhile, and so does more mic audio.
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    for (let i = 0; i < 15; i += 1) {
      asr.pushLiveAudio('system', speech(i));
      asr.pushLiveAudio('mic', speech(15 + i));
    }
    expect(engineState.recognized).toHaveLength(1);
    engineState.hold = null;
    release();

    await vi.waitFor(() => expect(engineState.recognized.length).toBeGreaterThanOrEqual(2));
    // The source that has waited goes next, not the one that just ran.
    expect(engineState.recognized[1].samples).toBe(15 * 1600);
    await vi.waitFor(() =>
      expect(new Set(store.getState().segments.map((s) => s.source))).toEqual(new Set(['mic', 'system'])),
    );
    for (const seg of store.getState().segments) expect(seg.speaker.startsWith(seg.source)).toBe(true);
  });

  it('serves a source that has shown nothing yet before the other source\'s update', async () => {
    const { asr } = await readyWebgpuAsr();
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));

    // Mic shows its first partial, then a second update comes due while the
    // system's first window is also due: system goes first.
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    engineState.hold = null;
    release();
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(15 + i));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));
    for (let i = 0; i < 18; i += 1) asr.pushLiveAudio('mic', speech(30 + i));
    for (let i = 0; i < 12; i += 1) asr.pushLiveAudio('system', speech(i));
    engineState.hold = null;
    release();
    await vi.waitFor(() => expect(engineState.recognized.length).toBeGreaterThanOrEqual(3));
    expect(engineState.recognized[2].firstSample).toBe(new Int16Array(speech(0))[0] / 32768);
  });

  it('places segments on the capture clock and takes the speaker diarization gives that span', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = () => [{ text: 'hello', start: 0.5, end: 1.0 }];
    asr.setSpeakerTimeline({
      speakerFor: (_source, start, end) => (start >= 30 && end <= 33 ? 'mic:1' : null),
      speakerNear: (_source, start, end) => (start >= 30 && end <= 33 ? 'mic:1' : null),
      changePoints: () => [],
      turnEnds: () => [],
    });

    // Frames 300.. on the capture clock: the model came up 30 s into the
    // recording, so the first word is at 30.5 s, not 0.5 s.
    for (let i = 0; i < 25; i += 1) asr.pushLiveAudio('mic', speech(300 + i), (300 + i) * 1600);
    await vi.waitFor(() => expect(store.getState().segments).toHaveLength(1));

    const [seg] = store.getState().segments;
    expect(seg.start).toBe(30.5);
    expect(seg.end).toBe(31);
    expect(seg.speaker).toBe('mic:1');
  });

  it('closes the open segment once a speaker turn ends inside it', async () => {
    const { asr, store } = await readyWebgpuAsr();
    engineState.words = (sec) =>
      [
        { text: 'mine', start: 0.2, end: 0.8 },
        { text: 'yours', start: 2.6, end: 3.2 },
      ].filter((w) => w.end <= sec);
    asr.setSpeakerTimeline({
      speakerFor: (_source, start) => (start < 2.5 ? 'mic:0' : 'mic:1'),
      speakerNear: (_source, start) => (start < 2.5 ? 'mic:0' : 'mic:1'),
      changePoints: () => [],
      turnEnds: (_source, start, end) => [2.5].filter((t) => t > start && t < end),
    });

    // The fast first take (0.4 s) hears nothing yet; the next one, 1.5 s later, only 'mine'.
    for (let i = 0; i < 21; i += 1) asr.pushLiveAudio('mic', speech(i), i * 1600);
    await vi.waitFor(() => expect(store.getState().segments).toHaveLength(1));
    // Speech throughout, so only the turn end can close the segment.
    expect(store.getState().segments[0].final).toBe(false);
    for (let i = 21; i < 40; i += 1) asr.pushLiveAudio('mic', speech(i), i * 1600);
    await vi.waitFor(() => expect(store.getState().segments).toHaveLength(2));
    expect(store.getState().segments.map((s) => [s.text, s.final, s.speaker])).toEqual([
      ['mine', true, 'mic:0'],
      ['yours', false, 'mic:1'],
    ]);
  });
});

describe('the overlap second pass on the live engine', () => {
  /** 100 ms of Int16 PCM at 16 kHz. */
  function frame(index: number): ArrayBuffer {
    return Int16Array.from(voice(1600, 0.3, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }
  const turns = [
    { speaker: 'mic:0', start: 0, end: 3, final: true },
    { speaker: 'mic:1', start: 1, end: 3, final: true },
  ];

  async function overlapped() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = await import('./store');
    store.resetSession('both');
    const overlap = await import('./overlap-retranscribe');
    // Held audio only: no live window is due, so the engine stays idle.
    for (let i = 0; i < 50; i += 1) overlap.pushOverlapAudio('mic', frame(i), i * 1600);
    overlap.noteOverlapTurns('mic', turns);
    engineState.recognized.length = 0;
    engineState.words = () => [{ text: 'overlapped', start: 0.5, end: 0.9 }];
    return { asr, store, overlap };
  }

  it('re-reads an overlap after it ends, on the loaded engine, and adds the missed words', async () => {
    const { store, overlap } = await overlapped();
    await overlap.flushOverlapRetranscribe();
    expect(engineState.recognized).toHaveLength(1);
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['overlapped', true]]);
  });

  it('caps the clip it hands the engine', async () => {
    const { asr, overlap } = await overlapped();
    overlap.resetOverlapRetranscribe();
    for (let i = 0; i < 200; i += 1) overlap.pushOverlapAudio('mic', frame(i), i * 1600);
    overlap.noteOverlapTurns('mic', [
      { speaker: 'mic:0', start: 0, end: 15, final: true },
      { speaker: 'mic:1', start: 1, end: 15, final: true },
    ]);
    await overlap.flushOverlapRetranscribe();
    expect(engineState.recognized).toHaveLength(1);
    expect(engineState.recognized[0].samples).toBe(asr.OVERLAP_CLIP_MAX_SECONDS * 16000);
  });

  it('is skipped while a live window is running, and never delays it', async () => {
    const { asr, store, overlap } = await overlapped();
    let release!: () => void;
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 30; i += 1) asr.pushLiveAudio('mic', frame(100 + i), (100 + i) * 1600);
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(1));

    // The live window holds the engine: the clip waits, then is dropped.
    const pass = overlap.flushOverlapRetranscribe(5000);
    await new Promise((r) => setTimeout(r, 1200));
    engineState.hold = null;
    release();
    await pass;
    expect(engineState.recognized).toHaveLength(1);
    expect(store.getState().segments.some((s) => s.id.startsWith('ovl-'))).toBe(false);
  });
});

describe('lowConfidenceSpans', () => {
  it('spans each word under 0.65 at its character offsets, one span per run', () => {
    const text = 'we ship the the release friday';
    const words = [
      { text: 'we', start: 0, end: 1, confidence: 0.99 },
      { text: 'ship', start: 1, end: 2, confidence: 0.4 },
      { text: 'the', start: 2, end: 3, confidence: 0.9 },
      { text: 'the', start: 3, end: 4, confidence: 0.5 },
      { text: 'release', start: 4, end: 5, confidence: 0.2 },
      { text: 'friday', start: 5, end: 6, confidence: 0.95 },
    ];
    expect(lowConfidenceSpans(text, words)).toEqual([
      [3, 7, 0.4],
      [12, 15, 0.5],
      [16, 23, 0.2],
    ]);
  });

  it('skips words without confidence and words it cannot locate', () => {
    expect(
      lowConfidenceSpans('hello world', [
        { text: 'hello', start: 0, end: 1 },
        { text: 'missing', start: 1, end: 2, confidence: 0.1 },
      ]),
    ).toEqual([]);
  });
});


describe('Stop flush of the live windows', () => {
  function speech(index: number, level = 0.3): ArrayBuffer {
    return Int16Array.from(voice(1600, level, index * 1600), (x) => Math.round(x * 32767)).buffer;
  }

  async function readyWebgpuAsr() {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    expect(await asr.ensureBrowserASRReady()).toBe(true);
    const store = await import('./store');
    store.resetSession('mic');
    return { asr, store };
  }

  it('transcribes every buffered second on Stop, not only the first 10 s window', async () => {
    const { asr, store } = await readyWebgpuAsr();
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    // Inference slower than real time: 18 s of speech piles up behind one window.
    for (let i = 0; i < 180; i += 1) asr.pushLiveAudio('mic', speech(i));
    expect(engineState.recognized).toHaveLength(1);

    // A word every half second of whatever window the model is handed.
    engineState.words = (s) =>
      Array.from({ length: Math.floor(s / 0.5) }, (_, i) => ({ text: `w${i}`, start: i * 0.5, end: i * 0.5 + 0.4 }));
    const flushed = asr.flushLiveAudio();
    engineState.hold = null;
    release();
    await flushed;

    const segments = store.getState().segments;
    expect(segments.every((s) => s.final)).toBe(true);
    // The last words of the recording made it, not only the first 10 s.
    expect(Math.max(...segments.map((s) => s.end))).toBeGreaterThan(17);
  });

  it('reports progress while the flush runs, and clears it after', async () => {
    const { asr } = await readyWebgpuAsr();
    const progress = await import('./live-flush-progress');
    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    for (let i = 0; i < 40; i += 1) asr.pushLiveAudio('mic', speech(i));

    const flushed = asr.flushLiveAudio();
    expect(progress.getLiveFlushProgress()).toEqual({ done: 0, total: 40 * 1600 });
    engineState.hold = null;
    release();
    await flushed;
    expect(progress.getLiveFlushProgress()).toBeNull();
  });

  it('closes the open segment when its last window outlives the flush, and drops that late result', async () => {
    const { asr, store } = await readyWebgpuAsr();
    for (let i = 0; i < 15; i += 1) asr.pushLiveAudio('mic', speech(i));
    await vi.waitFor(() => expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello', false]]));

    let release: () => void = () => {};
    engineState.hold = new Promise<void>((resolve) => (release = resolve));
    engineState.words = () => [
      { text: 'hello', start: 0.1, end: 0.5 },
      { text: 'late', start: 2, end: 2.5 },
    ];
    for (let i = 15; i < 30; i += 1) asr.pushLiveAudio('mic', speech(i));
    await vi.waitFor(() => expect(engineState.recognized).toHaveLength(2));

    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const flushed = asr.flushLiveAudio();
      await vi.advanceTimersByTimeAsync(asr.LIVE_FLUSH_WAIT_MS + 1000);
      await flushed;
    } finally {
      vi.useRealTimers();
    }
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello', true]]);

    engineState.hold = null;
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(store.getState().segments.map((s) => [s.text, s.final])).toEqual([['hello', true]]);
  });
});
