import type { Worker } from 'node:worker_threads';
import type { Pending } from './asr-pending';

export interface Slot {
  worker: Worker;
  pending: Map<number, Pending>;
  ready: Promise<void>;
}
