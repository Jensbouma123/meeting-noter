/**
 * Public entry point: `createDiarizer({ source })` — see `types.ts` for the
 * returned shape and `README.md` for the full write-up (model choices,
 * sizes, algorithm, and how a pipeline worker should wire this in).
 *
 * Spins up (or reuses) one shared Web Worker for the page — all diarizer
 * instances share it, so the ~73 MB model is downloaded and loaded
 * once regardless of how many sources (`mic`, `system`) are diarized. That
 * worker is terminated when the **last** diarizer is disposed, so the sessions
 * are genuinely returned between recordings rather than pinned for the life of
 * the page: sharing is what avoids duplication *while* recording, and on a
 * memory-bound tab (see `src/lib/asr/browser/parakeet.ts` for the same
 * reasoning on the much larger speech model) holding it forever is the wrong
 * trade.
 */

import { debugEnabled } from '../../asr/browser/quiet-console';
import { reportSpeakerState, speakerSeedFor } from './speaker-state';
import type { Diarizer, DiarizerErrorCode, DiarizerOptions, DiarizerReady, SpeakerTurn } from './types';
import type { WorkerInMessage, WorkerOutMessage } from './worker';

let sharedWorker: Worker | null = null;
let liveDiarizers = 0;

function acquireWorker(): Worker {
  liveDiarizers += 1;
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  }
  return sharedWorker;
}

function releaseWorker(worker: Worker): void {
  liveDiarizers -= 1;
  if (liveDiarizers > 0 || sharedWorker !== worker) return;
  worker.terminate();
  sharedWorker = null;
}

let nextId = 0;

export function createDiarizer(options: DiarizerOptions): Diarizer {
  const worker = acquireWorker();
  const id = `diarizer-${++nextId}`;
  const listeners = new Set<(turn: SpeakerTurn) => void>();
  const errorListeners = new Set<(message: string, code: DiarizerErrorCode) => void>();
  const readyListeners = new Set<(info: DiarizerReady) => void>();
  const flushWaiters = new Set<() => void>();
  let disposed = false;

  const settleFlushes = () => {
    for (const done of flushWaiters) done();
    flushWaiters.clear();
  };

  const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
    const msg = ev.data;
    if (!msg || msg.id !== id) return;
    if (msg.type === 'turn') {
      for (const cb of listeners) cb(msg.turn);
    } else if (msg.type === 'flushed') {
      if (msg.speakerState) reportSpeakerState(options.source, msg.speakerState);
      settleFlushes();
    } else if (msg.type === 'ready') {
      for (const cb of readyListeners) cb({ backend: msg.backend });
    } else if (msg.type === 'error') {
      console.error(`[diarization:${options.source}] ${msg.message}`);
      for (const cb of errorListeners) cb(msg.message, msg.code ?? 'failed');
    }
  };
  worker.addEventListener('message', onMessage);

  const init: WorkerInMessage = {
    type: 'init',
    id,
    source: options.source,
    debug: debugEnabled(),
    speakerState: options.speakerState ?? speakerSeedFor(options.source),
  };
  worker.postMessage(init);

  return {
    push(chunk: Float32Array, startSample?: number): void {
      if (disposed) return;
      const msg: WorkerInMessage = { type: 'push', id, chunk, startSample };
      worker.postMessage(msg, [chunk.buffer]);
    },
    flush(timeoutMs = 3000): Promise<void> {
      if (disposed) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          flushWaiters.delete(done);
          resolve();
        }, timeoutMs);
        const done = () => {
          clearTimeout(timer);
          resolve();
        };
        flushWaiters.add(done);
        const msg: WorkerInMessage = { type: 'flush', id };
        worker.postMessage(msg);
      });
    },
    onSpeakerTurn(cb: (turn: SpeakerTurn) => void): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    onError(cb: (message: string, code: DiarizerErrorCode) => void): () => void {
      errorListeners.add(cb);
      return () => errorListeners.delete(cb);
    },
    onReady(cb: (info: DiarizerReady) => void): () => void {
      readyListeners.add(cb);
      return () => readyListeners.delete(cb);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      // Drop this source's core and its buffered audio in the worker, then
      // detach. The worker itself (and its ONNX sessions) goes away with the
      // last diarizer.
      const msg: WorkerInMessage = { type: 'dispose', id };
      worker.postMessage(msg);
      worker.removeEventListener('message', onMessage);
      listeners.clear();
      errorListeners.clear();
      readyListeners.clear();
      settleFlushes();
      releaseWorker(worker);
    },
  };
}

export type {
  Diarizer,
  DiarizerErrorCode,
  DiarizerOptions,
  DiarizerReady,
  Source,
  SpeakerTurn,
} from './types';
