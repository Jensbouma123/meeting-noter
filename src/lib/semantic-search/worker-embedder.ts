import { reportEmbedFailed, reportEmbedProgress, reportEmbedReady } from './embed-progress';
import type { EncodedIndex, WorkerReply as Reply } from './encoded-index.types';
import { EMBEDDING_DIM, type EmbedWorkerIn, type EmbedWorkerLike, type WorkerEmbedder } from './types';

export function createWorkerEmbedder(
  spawn: () => EmbedWorkerLike = () =>
    new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as EmbedWorkerLike,
): WorkerEmbedder {
  let worker: EmbedWorkerLike | null = null;
  let nextId = 0;
  const pending = new Map<number, { resolve: (v: Reply) => void; reject: (e: Error) => void }>();

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
        p.resolve('record' in data ? data.record : data.vectors);
      }
    };
    w.onerror = (e) => failAll(e.message ?? 'embedding worker crashed');
    worker = w;
    return w;
  };

  const request = <T extends Reply>(build: (id: number) => EmbedWorkerIn): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: (v) => resolve(v as T), reject });
      ensure().postMessage(build(id));
    });

  return {
    dim: EMBEDDING_DIM,
    embed(texts, role = 'document') {
      return request<Float32Array[]>((id) => ({ id, texts, role }));
    },
    indexMeeting(meetingId, lines) {
      return request<EncodedIndex | null>((id) => ({
        id,
        kind: 'index',
        meetingId,
        lines,
      }));
    },
    terminate() {
      failAll('embedding worker terminated');
    },
  };
}
