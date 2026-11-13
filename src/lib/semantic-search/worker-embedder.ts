import { reportEmbedFailed, reportEmbedProgress, reportEmbedReady } from './embed-progress';
import { EMBEDDING_DIM, type EmbedWorkerLike, type WorkerEmbedder } from './types';

export function createWorkerEmbedder(
  spawn: () => EmbedWorkerLike = () =>
    new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as EmbedWorkerLike,
): WorkerEmbedder {
  let worker: EmbedWorkerLike | null = null;
  let nextId = 0;
  const pending = new Map<
    number,
    { resolve: (v: Float32Array[]) => void; reject: (e: Error) => void }
  >();

  const failAll = (message: string) => {
    reportEmbedFailed(message);
    for (const p of pending.values()) p.reject(new Error(message));
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  const ensure = (): EmbedWorkerLike => {
    if (worker) return worker;
    const w = spawn();
    w.onmessage = (e) => {
      const data = e.data;
      if ('progress' in data) {
        reportEmbedProgress(data.progress.file, data.progress.loaded, data.progress.total);
        return;
      }
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if ('error' in data) {
        reportEmbedFailed(data.error);
        p.reject(new Error(data.error));
      } else {
        reportEmbedReady();
        p.resolve(data.vectors);
      }
    };
    w.onerror = (e) => failAll(e.message ?? 'embedding worker crashed');
    worker = w;
    return w;
  };

  return {
    dim: EMBEDDING_DIM,
    embed(texts, role = 'document') {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ensure().postMessage({ id, texts, role });
      });
    },
    terminate() {
      failAll('embedding worker terminated');
    },
  };
}
