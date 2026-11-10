import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserASRLoadProgress, BrowserASREvents } from './types';

/**
 * The initialization half of the model-progress bar, measured where it is
 * actually produced: inside `BrowserASREngine._loadModel()` — plus the memory
 * ownership that load depends on.
 *
 * ORT reports no progress at all, so the engine reports the three milestones
 * it can genuinely observe — the files it checked against the cache, session
 * creation resolving, and one real inference. This test pins that those
 * milestones are emitted in that order and that they are driven by *work that
 * happened*, not by elapsed time: session creation only resolves when the test
 * says so, and a model whose warm-up throws must still finish loading.
 *
 * It also pins the fix for the Safari tab crashes: the engine resolves the
 * model's URLs itself and **revokes them** the moment the sessions exist. A
 * live object URL pins its Blob, and leaking every one of them is what left
 * the WASM path holding the 652 MB int8 encoder for the rest of the page's
 * life, *on top of* the copy ONNX Runtime made inside the session — the
 * allocation a WebContent process died making.
 *
 * The cache itself is mocked here, deliberately. This file is about what the
 * engine *does* with the answers — how it counts, what it reports, and when it
 * lets go of the bytes — and it needs to control those answers (including
 * never getting one). The real cache, its schema, the chunking and the rule
 * that no Blob ever reaches `put()` are covered in
 * `resumable-download.cache.test.ts` and `model-cache-db.test.ts`; driving
 * those here would only make this file slower and its failures harder to read.
 *
 * `parakeet.js` is mocked so no ONNX runtime is created: `fromUrls` resolves
 * when the test says so.
 */

const loadState = vi.hoisted(() => ({
  /** Held open so the test controls exactly when "session creation" ends. */
  hold: false,
  /** Never settles at all — the session-creation hang. */
  hangCreate: false,
  failWarmUp: false,
  failCreate: false,
  /** Held open so an inference is observably in flight. */
  holdTranscribe: false,
  transcribeCalls: [] as number[],
  melResets: 0,
  revoked: [] as string[],
  createdFrom: [] as string[],
  /**
   * How the file resolver behaves:
   * - `files: 'cached'` (default) answers every file from the cache, as a warm
   *   load does, and reports no fetch progress at all;
   * - `files: 'bytes'` reports the bytes of a file that is *not* cached, the
   *   way a real download inside a load does;
   * - `files: 'hang'` never settles and never reports — the reported bug.
   */
  files: 'cached' as 'cached' | 'bytes' | 'hang',
  /** Files the cache probe walks, per file list. */
  probe: [] as string[],
  /** Progress events the resolver forwarded, in order. */
  reported: [] as Array<{ loaded: number; total: number; file: string }>,
  /** How many files the resolver has answered so far. */
  served: 0,
}));

vi.mock('parakeet.js', () => ({
  ParakeetModel: {
    fromUrls: async (cfg: { encoderUrl: string; decoderUrl: string }) => {
      if (loadState.hangCreate) {
        // Session creation that never settles and reports nothing — the step
        // with a history of hanging, now under its own watchdog.
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

/**
 * The cache/downloader, as the engine sees it: a probe that walks the file
 * list, and a resolver that answers with a `blob:` URL per file.
 */
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
      // Only the *first* file is interesting: that is the shape of a real load
      // in trouble (one file missing from the cache, the rest warm), and it
      // keeps the expectations about progress unambiguous.
      if (loadState.served === 0) {
        loadState.served += 1;
        if (loadState.files === 'hang') {
          // A read or a `fetch` that never resolves and never yields a chunk.
          // Nothing rejects, nothing logs: this is the state the UI used to
          // sit in, on a bar that stops moving with no error anywhere.
          return new Promise(() => {});
        }
        if (loadState.files === 'bytes') {
          // A real transfer inside the load: two chunks, so "is it moving?"
          // has a yes and a no.
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

/**
 * `URL.revokeObjectURL` doesn't exist in Node, and a real object-URL registry
 * can't be asserted against anyway — the engine's obligation is simply to call
 * it for every URL it was handed, so that is what is recorded here.
 */
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
    // A priming 0/n, then one event per file — none skipped.
    expect(files.map((p) => p.done)).toEqual([0, 1, 2, 3]);
    expect(files.every((p) => p.total === 3)).toBe(true);
    // The session and the warm-up are only claimed *after* the real work.
    expect(progress.map((p) => p.stage)).toEqual([
      'files',
      'files',
      'files',
      'files',
      'session',
      'warmup',
    ]);
    // The warm-up is a real inference over a second of 16 kHz audio, and its
    // features are dropped afterwards so they can't leak into the first real
    // frame.
    expect(loadState.transcribeCalls).toEqual([16000]);
    expect(loadState.melResets).toBe(1);
  });

  it('still counts the files when the cache is empty — the stage is the read, not the hit', async () => {
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    // Nothing cached (a fresh page in the test's IndexedDB): the probe still
    // walks all three files, so the bar moves rather than sitting at 0%.
    expect(progress.filter((p) => p.stage === 'files').map((p) => p.done)).toEqual([0, 1, 2, 3]);
  });

  it('does not claim a session before session creation has resolved', async () => {
    loadState.hold = true;
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    const engine = new BrowserASREngine({ ...WASM }, events);
    const loaded = engine.ensureLoaded();
    // Give the file probe a chance to finish; the load is then parked inside
    // session creation with the file stage reported and nothing beyond it.
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
    // The manifest's `files` used to be only a progress denominator: the hub
    // resolved the real list itself. The engine resolves the URLs now, so an
    // empty list means there is nothing to load from, and saying so is the
    // only honest outcome — `configFromManifest()` always sets it.
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await expect(
      new BrowserASREngine(
        { ...WASM, files: [] as unknown as typeof WASM.files },
        events,
      ).ensureLoaded(),
    ).rejects.toThrow(/manifest is missing required files/);

    // No `files` events at all — the stage is skipped rather than claimed with
    // a made-up 0/4, and no session or warm-up is reported either, because
    // nothing was built.
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

    // A warm-up that throws must not turn a working model into a load
    // failure — the sessions exist, and the real frames may work fine.
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

    // The engine owns the URLs (it called `getParakeetModel` itself instead of
    // `fromHub`) so it can drop them. Anything not revoked here is a second
    // resident copy of the model for the rest of the page's life.
    expect(loadState.createdFrom.length).toBeGreaterThan(0);
    // Every URL the engine was handed, including the tokenizer's — the resolver
    // makes no distinction between "big" and "small" files, and a URL left
    // behind is a file left behind.
    expect(new Set(loadState.revoked)).toEqual(
      new Set([...WASM.files].map((file) => `blob:fake/${file}`)),
    );
  });

  it('releases the blob URLs even when session creation fails', async () => {
    // The failure path is exactly where a leaked buffer hurts most: the user
    // retries, and the retry then runs alongside a pinned copy of the model.
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
    expect(loadState.createdFrom.length).toBe(2); // encoder + decoder

    await engine.stop();

    // `parakeet.js` 1.4.4 has no `release()` for its ONNX sessions, so
    // dropping the model here would hand ~670 MB back to the GC and make the
    // next Record build a second copy on top. One loaded model per page is the
    // smaller steady state.
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

/**
 * The two ways `getParakeetModel` can be slow, and the difference between
 * them.
 *
 * When the hub cannot read its IndexedDB cache it falls back to fetching every
 * file itself, one `fetch` at a time, reporting nothing unless someone wires up
 * its `progress` callback. That is the state the reported bug lived in: the
 * model was being re-downloaded in full, inside a function with no timeout, no
 * progress and no error, so the preparation bar sat on the last stage it had
 * genuinely reached — "Initializing model 35%", the file-probe weight — for as
 * long as the user cared to wait. Nothing was broken-looking, and nothing was
 * working.
 *
 * So the engine now wires up that callback, and a watchdog that fails the load
 * if the bytes stop moving. These tests pin both halves: real progress is
 * reported with its real numbers, and silence becomes a stated error instead
 * of a hang.
 */
describe('a file that is not cached yet', () => {
  it('reports the real byte counts while it is downloaded during the load', async () => {
    loadState.files = 'bytes';
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    const fetches = progress.filter((p) => p.stage === 'fetch');
    // Only the chunks that actually arrived, with the numbers the hub
    // reported — not an invented interpolation, and not a stage claimed as
    // complete.
    expect(fetches.map((p) => p.loadedBytes)).toEqual([400, 900]);
    expect(fetches.every((p) => p.totalBytes === 900 && p.file === 'encoder-model.int8.onnx')).toBe(
      true,
    );
    // The file stage is untouched: fetching bytes is not the same real work as
    // reading them out of the cache, and must not claim to be.
    expect(progress.filter((p) => p.stage === 'files').map((p) => p.done)).toEqual([0, 1, 2, 3]);
  });

  it('says nothing about fetching when the cache served the files', async () => {
    // The common case: every file is already in the cache, so nothing is being
    // fetched. A "Fetching: 0 B" line here would be inventing work that is
    // not happening.
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    await new BrowserASREngine({ ...WASM }, events).ensureLoaded();

    expect(progress.some((p) => p.stage === 'fetch')).toBe(false);
  });

  it('fails the load with an actionable message when the bytes stop coming', async () => {
    loadState.files = 'hang';
    const { BrowserASREngine } = await import('./parakeet');
    const { progress, events } = recorder();

    // The watchdog's own deadline is 45 s; the fake clock jumps straight to it
    // rather than the test waiting for a real one.
    vi.useFakeTimers();
    const loaded = new BrowserASREngine({ ...WASM }, events).ensureLoaded();
    const assertion = expect(loaded).rejects.toThrow(/made no progress/);
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    vi.useRealTimers();

    // The file stage was reported honestly before the hang, and the session
    // stage was never claimed — a stalled fetch is not a created session.
    expect(progress.map((p) => p.stage)).toEqual(['files', 'files', 'files', 'files']);
  });

  it('fails the load with an actionable message when session creation hangs', async () => {
    // The "stuck at 99%" failure: the files arrived, the sessions never came,
    // and the old watchdog only covered URL resolution — so its rejection had
    // nowhere to go and the bar sat short of `ready` forever. Session
    // creation runs under its own generous deadline now, and a hang there is
    // a stated error that names memory first.
    loadState.hangCreate = true;
    const { BrowserASREngine, SESSION_STALL_MS } = await import('./parakeet');
    const { progress, events } = recorder();

    // The session watchdog's own deadline is minutes; the fake clock jumps
    // straight to it rather than the test waiting for a real one.
    vi.useFakeTimers();
    const loaded = new BrowserASREngine({ ...WASM }, events).ensureLoaded();
    const assertion = expect(loaded).rejects.toThrow(/made no progress/);
    await vi.advanceTimersByTimeAsync(SESSION_STALL_MS + 60_000);
    await assertion;
    vi.useRealTimers();

    // The file stage was reported honestly before the hang, and the session
    // stage was never claimed — a session that never finished being created
    // is not a created session.
    expect(progress.map((p) => p.stage)).toEqual(['files', 'files', 'files', 'files']);
    // A hung session creation must not pin the bytes: the URLs are released
    // on the stall path exactly as on success and on failure.
    expect(new Set(loadState.revoked)).toEqual(
      new Set([...WASM.files].map((file) => `blob:fake/${file}`)),
    );
  });

  it('does not cut off a transfer that is still moving', async () => {
    // The failure mode of a naive timeout: a slow but perfectly healthy
    // multi-gigabyte transfer killed at a fixed deadline. Each byte count
    // restarts the watchdog, so 120 s of work with no 45 s gap completes and
    // only genuine silence is a failure.
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
    // It used to read `false` here: the capture pipeline dropped every frame
    // that arrived during an inference and called `acquireEngine()`, which
    // then built a second model beside this one.
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
