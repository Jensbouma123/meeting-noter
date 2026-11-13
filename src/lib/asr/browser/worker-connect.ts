import { isSafariEngine } from './is-safari-engine';
import { debugEnabled } from './quiet-console';
import { awaitWorkerHello } from './worker-handshake';
import type { WorkerCallChannel } from './worker-call-channel';
import type { BrowserASRConfig, EngineWorkerOut } from './types';

export type WorkerConnectOutcome = 'attached' | 'run-on-page' | 'disabled';

interface WorkerHandlers {
  onMessage: (msg: EngineWorkerOut) => void;
  onCrash: (message: string) => void;
}

export async function connectWorker(
  config: BrowserASRConfig,
  channel: WorkerCallChannel,
  handlers: WorkerHandlers,
): Promise<WorkerConnectOutcome> {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./engine-worker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    console.warn('[asr] Could not start the speech model worker; running it on the page', err);
    return 'run-on-page';
  }

  const hello = await awaitWorkerHello(worker);

  if (channel.disabled) {
    worker.terminate();
    return 'disabled';
  }
  if (hello === null) {
    worker.terminate();
    console.warn('[asr] The speech model worker did not start; running it on the page');
    return 'run-on-page';
  }
  if (config.backend !== 'wasm' && !hello.webgpu) {
    worker.terminate();
    return 'run-on-page';
  }

  channel.attach(worker);
  worker.onmessage = (event: MessageEvent<EngineWorkerOut>) => handlers.onMessage(event.data);
  worker.onerror = (event: ErrorEvent) => {
    event.preventDefault();
    handlers.onCrash(event.message || 'The speech model worker stopped');
  };
  worker.onmessageerror = () => handlers.onCrash('The speech model worker sent an unreadable message');

  const workerConfig: BrowserASRConfig =
    config.cpuThreads === undefined && isSafariEngine() ? { ...config, cpuThreads: 1 } : config;
  channel.post({ type: 'init', config: workerConfig, debug: debugEnabled() });
  return 'attached';
}
