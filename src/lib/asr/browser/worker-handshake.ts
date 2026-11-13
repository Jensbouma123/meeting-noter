import type { EngineWorkerOut } from './types';

export const WORKER_START_TIMEOUT_MS = 30_000;

export function awaitWorkerHello(worker: Worker): Promise<{ webgpu: boolean } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(null), WORKER_START_TIMEOUT_MS);
    const onMessage = (event: MessageEvent<EngineWorkerOut>) => {
      if (event.data?.type === 'hello') finish({ webgpu: event.data.webgpu });
    };
    const onError = (event: Event) => {
      event.preventDefault?.();
      finish(null);
    };
    function finish(value: { webgpu: boolean } | null) {
      clearTimeout(timer);
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      resolve(value);
    }
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
  });
}
