import { languageNameFor } from './languages';
import { acquireWorker, releaseWorker } from './shared-worker';
import type { LanguageDetector, LanguageResult, WorkerInMessage, WorkerOutMessage } from './types';

let nextId = 0;

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
  };
  worker.addEventListener('message', onMessage);
  worker.postMessage({ type: 'init', id } satisfies WorkerInMessage);

  return {
    push(samples: Float32Array, transfer = false): void {
      if (disposed) return;
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
      worker.postMessage({ type: 'dispose', id } satisfies WorkerInMessage);
      worker.removeEventListener('message', onMessage);
      languageCbs.clear();
      errorCbs.clear();
      releaseWorker(worker);
    },
  };
}
