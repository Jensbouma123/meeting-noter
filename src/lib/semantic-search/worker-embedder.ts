import type { EmbedWorkerIn, EmbedWorkerOut } from './worker';
import { EMBEDDING_DIM, type Embedder } from './types';

/** The slice of `Worker` this client uses; a test passes a fake. */
export interface EmbedWorkerLike {
  postMessage(msg: EmbedWorkerIn): void;
  onmessage: ((e: { data: EmbedWorkerOut }) => void) | null;
  onerror: ((e: { message?: string }) => void) | null;
  terminate(): void;
}

export interface WorkerEmbedder extends Embedder {
  /** Stops the worker and frees the model. A later `embed` starts a fresh one. */
  terminate(): void;
}

/**
 * `Embedder` that runs on a Web Worker. The worker (and so the model) starts
 * on the first `embed` call, never at construction.
 */
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
    for (const p of pending.values()) p.reject(new Error(message));
    pending.clear();
    worker?.terminate();
    worker = null;
  };

  const ensure = (): EmbedWorkerLike => {
    if (worker) return worker;
    const w = spawn();
    w.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if ('error' in e.data) p.reject(new Error(e.data.error));
      else p.resolve(e.data.vectors);
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
