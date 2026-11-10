/**
 * Web Worker entry point: owns the ONNX session and every `DiarizerCore`
 * instance created against this worker, so heavy inference never runs on the
 * main/UI thread. `index.ts` is the only intended caller (via `createDiarizer`);
 * this file speaks a small id-tagged postMessage protocol so one worker can
 * host multiple diarizers (e.g. one for `mic`, one for `system`) without
 * downloading or loading the model twice.
 */

import { DEFAULT_MODE, DiarizerCore, REALTIME_MODE } from './core';
import {
  assertDiarizationModelsCached,
  downloadDiarizationModels, modelSource,
  revokeModelUrls,
} from './downloader';
import { HIDDEN_SIZE, NUM_SPEAKERS, SORTFORMER_GRAPH, SORTFORMER_WEIGHTS, externalDataPath } from './manifest';
import { SortformerModel } from './sortformer-model';
import { deserializeSpeakerState, serializeSpeakerState, type SerializedSpeakerState } from './speaker-state';
import type { DiarizerErrorCode, DiarizerReady, Source, SpeakerTurn } from './types';

export type WorkerInMessage =
  /** `debug`: the page's `asr-debug` flag — log every step's timing.
   *  `speakerState`: a previous recording's speaker cache to start from. */
  | { type: 'init'; id: string; source: Source; debug?: boolean; speakerState?: SerializedSpeakerState }
  /** `startSample`: where the chunk's first sample sits on the caller's
   *  capture timeline, so turns come back on that timeline rather than
   *  counted from whichever push first found the models loaded. */
  | { type: 'push'; id: string; chunk: Float32Array; startSample?: number }
  | { type: 'flush'; id: string }
  | { type: 'dispose'; id: string };

export type WorkerOutMessage =
  | { type: 'ready'; id: string; backend: DiarizerReady['backend'] }
  /** `speakerState`: the flushed core's speaker cache, for a later
   *  recording of the same session to start from. */
  | { type: 'flushed'; id: string; speakerState?: SerializedSpeakerState }
  | { type: 'turn'; id: string; turn: SpeakerTurn }
  | { type: 'error'; id: string; message: string; code: DiarizerErrorCode };

/** Thrown when the model files are not in the cache. */
class NotCachedError extends Error {}

const ctx = self as unknown as {
  postMessage(message: WorkerOutMessage): void;
  onmessage: ((ev: MessageEvent<WorkerInMessage>) => void) | null;
};

/** Serializes calls so two diarizer instances sharing this worker's model
 *  (one per source) never issue concurrent `session.run()` calls against the
 *  same ONNX session. */
class Mutex {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn, fn);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

let modelPromise: Promise<SortformerModel> | null = null;

function loadModel(): Promise<SortformerModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      let urls: Record<string, string>;
      try {
        // Cache only: a download here would bypass the consent/progress UI.
        try {
          await assertDiarizationModelsCached();
        } catch (err) {
          throw new NotCachedError(err instanceof Error ? err.message : String(err));
        }
        urls = await downloadDiarizationModels();
      } catch (err) {
        // Not cached yet (or a read failed): let a later init retry.
        modelPromise = null;
        throw err;
      }
      const model = new SortformerModel();
      try {
        // Bytes rather than URLs, taken before the URLs are revoked (which
        // drops the downloader's copy): ONNX Runtime copies them into the
        // session, and nothing else should keep them.
        await model.load(modelSource(urls[SORTFORMER_GRAPH.filename]), {
          path: externalDataPath(SORTFORMER_WEIGHTS),
          data: modelSource(urls[SORTFORMER_WEIGHTS.filename]),
        });
        return model;
      } catch (err) {
        // A failed load must not leave half the model alive, so a retry
        // starts from a clean slate instead of stacking a second copy.
        model.dispose();
        modelPromise = null;
        throw err;
      } finally {
        revokeModelUrls(urls);
      }
    })();
  }
  return modelPromise;
}

const modelMutex = new Mutex();
const SHAPE = { hiddenSize: HIDDEN_SIZE, numSpeakers: NUM_SPEAKERS };
const diarizers = new Map<string, DiarizerCore>();
/** Ids disposed while their `init` was still loading the model. */
const disposedBeforeReady = new Set<string>();

/** Audio pushed while an id's model was loading, replayed into its core once
 *  ready — reading ~73 MB from IndexedDB and building the session takes
 *  seconds, and the speech in them is someone's too. */
const pending = new Map<string, { chunks: { chunk: Float32Array; startSample?: number }[]; samples: number }>();
/** Newest audio kept per id while loading (30 s at 16 kHz); older chunks
 *  are dropped, and the first kept one fixes the core's origin. */
export const MAX_PENDING_SAMPLES = 30 * 16_000;

function holdPending(id: string, chunk: Float32Array, startSample?: number): void {
  const held = pending.get(id);
  if (!held) return;
  held.chunks.push({ chunk, startSample });
  held.samples += chunk.length;
  while (held.samples > MAX_PENDING_SAMPLES && held.chunks.length > 1) {
    held.samples -= held.chunks.shift()!.chunk.length;
  }
}

async function handleMessage(msg: WorkerInMessage): Promise<void> {
  switch (msg.type) {
    case 'init': {
      pending.set(msg.id, { chunks: [], samples: 0 });
      let model: SortformerModel;
      try {
        model = await loadModel();
      } catch (err) {
        disposedBeforeReady.delete(msg.id);
        pending.delete(msg.id);
        throw err;
      }
      const held = pending.get(msg.id);
      pending.delete(msg.id);
      if (disposedBeforeReady.delete(msg.id)) return;
      // WASM needs the 4 s chunks to keep up (see core.ts); WebGPU runs the
      // 2 s ones well inside real time.
      const mode = model.backend === 'webgpu' ? REALTIME_MODE : DEFAULT_MODE;
      const core = new DiarizerCore({
        source: msg.source,
        model: { run: (...args) => modelMutex.run(() => model.run(...args)) },
        mode,
        turns: { provisional: true },
        speakerState: msg.speakerState ? deserializeSpeakerState(msg.speakerState, SHAPE) : null,
        onStep: msg.debug
          ? (audioSec, inferMs) =>
              console.debug(
                `[diarization] ${msg.source} step ${audioSec.toFixed(2)} s audio in ${inferMs.toFixed(0)} ms ` +
                  `(${model.backend}, RTF ${(inferMs / 1000 / audioSec).toFixed(2)})`,
              )
          : undefined,
      });
      core.onSpeakerTurn((turn) => ctx.postMessage({ type: 'turn', id: msg.id, turn }));
      diarizers.set(msg.id, core);
      ctx.postMessage({ type: 'ready', id: msg.id, backend: model.backend ?? 'wasm' });
      for (const { chunk, startSample } of held?.chunks ?? []) core.push(chunk, startSample);
      return;
    }
    case 'push': {
      // The first chunk that reaches a core fixes its origin on the capture
      // timeline.
      const core = diarizers.get(msg.id);
      if (core) core.push(msg.chunk, msg.startSample);
      else holdPending(msg.id, msg.chunk, msg.startSample);
      return;
    }
    case 'flush': {
      const core = diarizers.get(msg.id);
      if (!core) {
        ctx.postMessage({ type: 'flushed', id: msg.id });
        return;
      }
      await core.flush();
      const snapshot = core.snapshotSpeakers();
      ctx.postMessage({
        type: 'flushed',
        id: msg.id,
        speakerState: snapshot.numFrames > 0 ? serializeSpeakerState(snapshot, SHAPE) : undefined,
      });
      return;
    }
    case 'dispose': {
      if (!diarizers.has(msg.id)) disposedBeforeReady.add(msg.id);
      pending.delete(msg.id);
      diarizers.get(msg.id)?.dispose();
      diarizers.delete(msg.id);
      return;
    }
  }
}

ctx.onmessage = (ev) => {
  const msg = ev.data;
  handleMessage(msg).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    const code: DiarizerErrorCode = err instanceof NotCachedError ? 'not-cached' : 'failed';
    ctx.postMessage({ type: 'error', id: msg.id, message, code });
  });
};
