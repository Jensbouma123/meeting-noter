import { describe, expect, it } from 'vitest';
import { createMossformer2Client } from './client';
import type { SeparatorWorker } from './types/client';
import type { SeparatorRequest, SeparatorResponse } from './types/messages';

function fakeWorker(reply: (msg: SeparatorRequest) => SeparatorResponse | null) {
  const sent: { msg: SeparatorRequest; transfer: Transferable[] }[] = [];
  const worker: SeparatorWorker & { terminated: boolean } = {
    onmessage: null,
    onerror: null,
    terminated: false,
    postMessage(msg, transfer) {
      sent.push({ msg, transfer });
      const res = reply(msg);
      if (res) queueMicrotask(() => worker.onmessage?.({ data: res } as MessageEvent<SeparatorResponse>));
    },
    terminate() {
      worker.terminated = true;
    },
  };
  return { worker, sent };
}

describe('createMossformer2Client', () => {
  it('reports the backend the worker loaded on warm', async () => {
    const { worker } = fakeWorker((m) => ({ id: m.id, backend: 'webgpu' }));
    const client = createMossformer2Client(() => worker);
    expect(client.backend()).toBe('unloaded');
    expect(await client.warm()).toBe('webgpu');
    expect(client.backend()).toBe('webgpu');
  });

  it('sends a transferred copy and resolves with the worker tracks', async () => {
    const a = Float32Array.from([1]);
    const b = Float32Array.from([2]);
    const { worker, sent } = fakeWorker((m) => ({ id: m.id, backend: 'webgpu', tracks: [a, b] }));
    const client = createMossformer2Client(() => worker);
    const pcm = Float32Array.from([0.1, 0.2]);
    expect(await client.separate(pcm)).toEqual([a, b]);
    const msg = sent[0].msg as Extract<SeparatorRequest, { type: 'separate' }>;
    expect(msg.pcm).not.toBe(pcm);
    expect(Array.from(msg.pcm)).toEqual(Array.from(pcm));
    expect(sent[0].transfer).toEqual([msg.pcm.buffer]);
  });

  it('rejects on a worker error and keeps the reported backend', async () => {
    const { worker } = fakeWorker((m) => ({ id: m.id, backend: 'wasm', error: 'MossFormer2 needs WebGPU' }));
    const client = createMossformer2Client(() => worker);
    await expect(client.separate(new Float32Array(4))).rejects.toThrow('needs WebGPU');
    expect(client.backend()).toBe('wasm');
  });

  it('fails pending requests and marks the backend failed when the worker crashes', async () => {
    const { worker } = fakeWorker(() => null);
    const client = createMossformer2Client(() => worker);
    const run = client.separate(new Float32Array(4));
    worker.onerror?.({ message: 'boom' } as ErrorEvent);
    await expect(run).rejects.toThrow('boom');
    expect(client.backend()).toBe('failed');
  });

  it('terminates the worker and rejects pending work on dispose', async () => {
    const { worker } = fakeWorker(() => null);
    const client = createMossformer2Client(() => worker);
    const run = client.warm();
    client.dispose();
    await expect(run).rejects.toThrow('disposed');
    expect(worker.terminated).toBe(true);
    expect(client.backend()).toBe('unloaded');
  });
});
