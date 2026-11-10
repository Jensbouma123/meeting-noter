/** Language-ID worker: owns the ONNX sessions and all mel/DFT computation so
 *  none of it runs on the main thread. One worker for the whole page (see
 *  `index.ts`), hosting one detection buffer per source. The model is loaded
 *  once and shared by every source — loading it per source is what used to
 *  double this app's optional-model memory at the moment Record was pressed. */
import { computeLogMelSpectrogram } from './mel';
import { loadLangIdModel, detectLanguage, type LangIdModel } from './model';
import { languageNameFor } from './languages';
import { LANGID_N_SAMPLES } from './manifest';
import { SampleRing } from './ring-buffer';
import { countSpeechSamples } from './speech';
import { MIN_SPEECH_SAMPLES, pickSupportedLanguage } from './decision';

export type WorkerInMessage =
  | { type: 'init'; id: string }
  | { type: 'push'; id: string; samples: Float32Array }
  | { type: 'dispose'; id: string };

export type WorkerOutMessage =
  | { type: 'language'; id: string; code: string; name: string; confidence: number }
  | { type: 'progress'; id: string; loaded: number; total: number; file: string }
  | { type: 'error'; id: string; message: string };

const RECHECK_INTERVAL_SAMPLES = 20 * 16_000; // re-run every ~20s of new audio per source

/** One source's rolling window + scheduling state. */
interface SourceState {
  /** Only the most recent 30s matters (the encoder's fixed input span). */
  window: SampleRing;
  samplesSinceLastRun: number;
  hasRunOnce: boolean;
  /** New samples required before the next pass; lowered after a too-quiet window. */
  recheckAfterSamples: number;
  running: boolean;
}

const sources = new Map<string, SourceState>();

function createState(): SourceState {
  return {
    window: new SampleRing(LANGID_N_SAMPLES),
    samplesSinceLastRun: 0,
    hasRunOnce: false,
    recheckAfterSamples: RECHECK_INTERVAL_SAMPLES,
    running: false,
  };
}

let model: LangIdModel | null = null;
let modelLoading: Promise<LangIdModel> | null = null;

/**
 * Every source shares one encoder and one decoder session, and ORT sessions
 * are not safe to `run()` concurrently ("Session already started" on WebGPU,
 * clobbered IO bindings on WASM). Each source's pass waits for the previous
 * one, the same way the diarization worker serialises its sessions.
 */
let inferenceTail: Promise<void> = Promise.resolve();

function serialised<T>(task: () => Promise<T>): Promise<T> {
  const result = inferenceTail.then(task);
  inferenceTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function post(message: WorkerOutMessage): void {
  postMessage(message);
}

async function ensureModel(id: string): Promise<LangIdModel> {
  if (model) return model;
  if (!modelLoading) {
    // Whichever source happens to trigger the load gets the download progress.
    // Nobody consumes it yet (see `index.ts`) — the shape is kept because the
    // worker protocol has always carried it.
    modelLoading = loadLangIdModel((loaded, total, file) => post({ type: 'progress', id, loaded, total, file }));
    // A failed load must not be cached: the next recheck retries it rather
    // than re-posting the same rejection for the rest of the session.
    modelLoading.catch(() => {
      modelLoading = null;
    });
  }
  model = await modelLoading;
  return model;
}

const MIN_SAMPLES_BEFORE_FIRST_RUN = 5 * 16_000; // ~5s of audio buffered
/** After a window turned out to hold too little speech, wait for this much new audio before looking again. */
const RETRY_AFTER_SILENCE_SAMPLES = 5 * 16_000;

async function maybeRun(id: string, state: SourceState): Promise<void> {
  if (state.running) return;
  if (state.window.length < MIN_SAMPLES_BEFORE_FIRST_RUN) return;
  if (state.hasRunOnce && state.samplesSinceLastRun < state.recheckAfterSamples) return;

  state.running = true;
  state.hasRunOnce = true;
  state.samplesSinceLastRun = 0;
  try {
    const top = await serialised(async () => {
      // Disposed while waiting behind another source's pass.
      if (sources.get(id) !== state) return undefined;
      const window = state.window.toArray();
      // Silence and room noise get a confident-looking answer from Whisper
      // too (often an exotic language), so identify only windows that hold
      // enough actual speech, and look again soon rather than in 20 s.
      if (countSpeechSamples(window) < MIN_SPEECH_SAMPLES) {
        state.recheckAfterSamples = RETRY_AFTER_SILENCE_SAMPLES;
        return undefined;
      }
      state.recheckAfterSamples = RECHECK_INTERVAL_SAMPLES;
      const loaded = await ensureModel(id);
      return pickSupportedLanguage(await detectLanguage(loaded, computeLogMelSpectrogram(window)));
    });
    if (top && sources.get(id) === state) {
      post({ type: 'language', id, code: top.code, name: languageNameFor(top.code), confidence: top.confidence });
    }
  } catch (err) {
    post({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  } finally {
    state.running = false;
  }
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    if (!sources.has(msg.id)) sources.set(msg.id, createState());
  } else if (msg.type === 'push') {
    // Unknown id: audio still in flight for a source whose detector was
    // disposed mid-frame. Drop it rather than resurrecting the state — only
    // `init` creates a source.
    const state = sources.get(msg.id);
    if (!state) return;
    state.window.push(msg.samples);
    state.samplesSinceLastRun += msg.samples.length;
    void maybeRun(msg.id, state);
  } else if (msg.type === 'dispose') {
    // Drop that source's 30s window. The shared model and its sessions live
    // until the worker is terminated by the last detector (`index.ts`) — the
    // point is one copy per page, not one copy per source.
    sources.delete(msg.id);
  }
};
