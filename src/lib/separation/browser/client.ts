import type { SeparatorBackend } from '@/lib/meeting/types/overlap-separate';
import type { PendingRequest, SeparatorClient, SeparatorWorker } from './types/client';
import type { SeparatorRequest, SeparatorResponse } from './types/messages';

const spawnWorker = (): SeparatorWorker =>
  new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as SeparatorWorker;

export function createMossformer2Client(spawn: () => SeparatorWorker = spawnWorker): SeparatorClient {
  let worker: SeparatorWorker | null = null;
  let backend: SeparatorBackend = 'unloaded';
  let nextId = 0;
  const pending = new Map<number, PendingRequest>();

  const failAll = (err: Error) => {
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };

  const connect = (): SeparatorWorker => {
    if (worker) return worker;
    const w = spawn();
    w.onmessage = ({ data }) => {
      const p = pending.get(data.id);
      pending.delete(data.id);
      backend = data.backend;
      p?.resolve(data);
    };
    w.onerror = (event) => {
      backend = 'failed';
      failAll(new Error(event.message || 'Separator worker crashed'));
    };
    worker = w;
    return w;
  };

  const request = (build: (id: number) => SeparatorRequest, transfer: Transferable[] = []): Promise<SeparatorResponse> => {
    const id = ++nextId;
    const w = connect();
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      w.postMessage(build(id), transfer);
    });
  };

  return {
    name: 'mossformer2',
    backend: () => backend,
    warm: async () => (await request((id) => ({ id, type: 'warm' }))).backend,
    separate: async (pcm) => {
      const copy = pcm.slice();
      const res = await request((id) => ({ id, type: 'separate', pcm: copy }), [copy.buffer]);
      if (res.error || !res.tracks) throw new Error(res.error ?? 'Separator returned no tracks');
      return res.tracks;
    },
    dispose: () => {
      worker?.terminate();
      worker = null;
      backend = 'unloaded';
      failAll(new Error('Separator disposed'));
    },
  };
}
