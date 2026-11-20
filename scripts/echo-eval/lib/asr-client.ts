import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { EVAL_DIR } from './eval-dir';
import type { Pending } from '../types/asr-pending';
import type { Slot } from '../types/asr-slot';

const G = globalThis as unknown as { __echoEvalPool?: Slot[]; __echoEvalNext?: number };

const repoRoot = path.resolve(__dirname, '../../..');
export const MODEL_DIR =
  process.env.ECHO_EVAL_MODELS ?? path.join(EVAL_DIR, 'model');

function spawn(): Slot {
  const worker = new Worker(path.join(__dirname, 'asr-worker.mjs'), { workerData: { modelsDir: MODEL_DIR, repoRoot } });
  const pending = new Map<number, Pending>();
  const ready = new Promise<void>((resolve, reject) => {
    worker.on('error', reject);
    worker.on('message', (m: { ready?: boolean; id?: number; result?: unknown; error?: string }) => {
      if (m.ready) return resolve();
      const p = pending.get(m.id as number);
      pending.delete(m.id as number);
      if (m.error) p?.reject(new Error(m.error));
      else p?.resolve(m.result);
    });
  });
  return { worker, pending, ready };
}

export async function realTranscribe(audio: Float32Array, sampleRate: number, options: object): Promise<unknown> {
  G.__echoEvalPool ??= [spawn(), spawn()];
  const slot = G.__echoEvalPool[(G.__echoEvalNext = ((G.__echoEvalNext ?? -1) + 1) % G.__echoEvalPool.length)];
  await slot.ready;
  const id = Math.floor(Math.random() * 1e9);
  return new Promise((resolve, reject) => {
    slot.pending.set(id, { resolve, reject });
    slot.worker.postMessage({ id, audio, sampleRate, options });
  });
}
