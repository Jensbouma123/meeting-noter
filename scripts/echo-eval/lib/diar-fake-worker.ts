import { vi } from 'vitest';
import type { FakeWorkerScope } from '../types/fake-worker-scope';

const fake = new EventTarget() as EventTarget & { postMessage: (m: unknown) => void; terminate: () => void };
const scope: FakeWorkerScope = {
  onmessage: null,
  postMessage: (data) => fake.dispatchEvent(new MessageEvent('message', { data })),
};
fake.postMessage = (data) => queueMicrotask(() => scope.onmessage?.({ data }));
fake.terminate = () => {};

let loaded: Promise<unknown> | null = null;

export async function loadFakeWorker(): Promise<void> {
  loaded ??= (async () => {
    const orig = globalThis.self;
    vi.stubGlobal('self', scope);
    try {
      await import('@/lib/diarization/browser/worker');
    } finally {
      vi.stubGlobal('self', orig);
    }
  })();
  await loaded;
}

export const fakeSharedWorker = () => ({
  acquireWorker: () => fake as unknown as Worker,
  releaseWorker: () => {},
});
