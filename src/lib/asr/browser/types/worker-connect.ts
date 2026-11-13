import type { EngineWorkerOut } from './engine-protocol';

export type WorkerConnectOutcome = 'attached' | 'run-on-page' | 'disabled';

export interface WorkerHandlers {
  onMessage: (msg: EngineWorkerOut) => void;
  onCrash: (message: string) => void;
}
