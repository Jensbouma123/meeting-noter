/** Public entry point — browser spoken-language identification.
 *
 * See `README.md` for the wiring snippet and the rest of this package for
 * implementation details (`worker.ts` — buffering/scheduling, `model.ts` —
 * ONNX sessions, `mel.ts` — feature extraction, `languages.ts` — Whisper's
 * language-token table).
 */
import { languageNameFor } from './languages';

export type { LangIdPrediction } from './model';

export interface LanguageResult {
  code: string;
  name: string;
  confidence: number;
}

export interface LanguageDetector {
  /** Feed mono 16kHz PCM samples. Call with whatever chunk size the caller
   *  already has on hand (e.g. the same buffers handed to the ASR engine) —
   *  buffering and scheduling happen internally.
   *
   *  Pass `transfer: true` when the array is a fresh buffer the caller will
   *  never touch again (e.g. `int16ToFloat32`'s output): its buffer is then
   *  handed to the worker as is instead of being copied first. */
  push(samples: Float32Array, transfer?: boolean): void;
  /** Subscribe to detections. Returns an unsubscribe function. Fires once
   *  after the first ~5-10s of buffered speech, then again periodically as
   *  more audio arrives. */
  onLanguage(cb: (result: LanguageResult) => void): () => void;
  /** Subscribe to non-fatal errors (model load/inference failures) — the
   *  detector keeps running and will retry on the next periodic recheck. */
  onError(cb: (message: string) => void): () => void;
  /** Terminate the worker and release the ONNX sessions. */
  dispose(): void;
}

type WorkerInMessage =
  | { type: 'init'; id: string }
  | { type: 'push'; id: string; samples: Float32Array }
  | { type: 'dispose'; id: string };

type WorkerOutMessage =
  | { type: 'language'; id: string; code: string; name: string; confidence: number }
  | { type: 'progress'; id: string; loaded: number; total: number; file: string }
  | { type: 'error'; id: string; message: string };

/**
 * One worker for the whole page, shared by every detector.
 *
 * This was one worker — and one complete set of ONNX sessions — *per source*,
 * so recording in Both mode loaded the ~40 MB Whisper-tiny model twice, in two
 * workers, at the moment Record was pressed. That is pure duplication (the
 * bridge's doc comment claimed the "simplicity of not sharing a session across
 * instances" outweighed it; on a memory-constrained tab it does not, and it is
 * one of the reasons Safari's WebContent process died on load), and the
 * diarization bridge has been sharing its worker this way all along.
 *
 * Terminated when the last detector goes away, so the sessions really are
 * returned between recordings — sharing the worker is what avoids duplication
 * *while* recording, not a reason to keep it forever.
 */
let sharedWorker: Worker | null = null;
let liveDetectors = 0;
let nextId = 0;

function acquireWorker(): Worker {
  liveDetectors += 1;
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  }
  return sharedWorker;
}

function releaseWorker(worker: Worker): void {
  liveDetectors -= 1;
  if (liveDetectors > 0 || sharedWorker !== worker) return;
  worker.terminate();
  sharedWorker = null;
}

export function createLanguageDetector(): LanguageDetector {
  const worker = acquireWorker();
  const id = `langid-${++nextId}`;
  const languageCbs = new Set<(result: LanguageResult) => void>();
  const errorCbs = new Set<(message: string) => void>();
  let disposed = false;

  const onMessage = (event: MessageEvent<WorkerOutMessage>) => {
    const msg = event.data;
    if (!msg || msg.id !== id) return;
    if (msg.type === 'language') {
      const result: LanguageResult = { code: msg.code, name: languageNameFor(msg.code), confidence: msg.confidence };
      for (const cb of languageCbs) cb(result);
    } else if (msg.type === 'error') {
      for (const cb of errorCbs) cb(msg.message);
    }
    // 'progress' (model download) is intentionally not surfaced through this
    // API — the browser ASR download UI already owns model-download consent
    // and progress display; add a callback here if a caller needs it too.
  };
  worker.addEventListener('message', onMessage);
  // The worker only buffers audio for ids it was told about, so a push that
  // lands after `dispose` is dropped instead of re-creating the source.
  worker.postMessage({ type: 'init', id } satisfies WorkerInMessage);

  return {
    push(samples: Float32Array, transfer = false): void {
      if (disposed) return;
      // The buffer is always transferred. Unless the caller has said it owns
      // a fresh one, it is copied first so their array is not detached; a
      // view onto part of a larger buffer is copied regardless, since
      // transferring would ship (and detach) the whole thing.
      const ownsWholeBuffer = samples.byteOffset === 0 && samples.byteLength === samples.buffer.byteLength;
      const payload = transfer && ownsWholeBuffer ? samples : samples.slice();
      worker.postMessage({ type: 'push', id, samples: payload } satisfies WorkerInMessage, [payload.buffer]);
    },
    onLanguage(cb: (result: LanguageResult) => void): () => void {
      languageCbs.add(cb);
      return () => languageCbs.delete(cb);
    },
    onError(cb: (message: string) => void): () => void {
      errorCbs.add(cb);
      return () => errorCbs.delete(cb);
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      // Tell the worker to drop this source's buffer, then detach. The worker
      // (and its sessions) goes away with the last detector.
      worker.postMessage({ type: 'dispose', id } satisfies WorkerInMessage);
      worker.removeEventListener('message', onMessage);
      languageCbs.clear();
      errorCbs.clear();
      releaseWorker(worker);
    },
  };
}
