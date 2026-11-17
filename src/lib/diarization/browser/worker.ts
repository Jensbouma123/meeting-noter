import type { DiarizerCore } from './core';
import type { SortformerModel } from './sortformer-model';
import { serializeSpeakerState } from './speaker-state';
import type { DiarizerErrorCode, WorkerInMessage, WorkerOutMessage } from './types';
import { SPEAKER_SHAPE, createCore } from './worker-core';
import { NotCachedError, loadModel } from './worker-model';
import { holdAudio, startHoldingAudio, takeHeldAudio } from './worker-pending-audio';
import { WorkerRescore } from './worker-rescore';
import { runRescore, shouldRescore } from './worker-rescore-run';

const ctx = self as unknown as {
  postMessage(message: WorkerOutMessage): void;
  onmessage: ((ev: MessageEvent<WorkerInMessage>) => void) | null;
};

const post = (message: WorkerOutMessage) => ctx.postMessage(message);
const diarizers = new Map<string, DiarizerCore>();
const rescores = new Map<string, WorkerRescore>();
const flushedIds = new Set<string>();
const disposedBeforeReady = new Set<string>();
let loading = 0;

function startDiarizer(
  msg: Extract<WorkerInMessage, { type: 'init' }>,
  model: SortformerModel,
  rescore: WorkerRescore | null,
): void {
  const held = takeHeldAudio(msg.id);
  if (disposedBeforeReady.delete(msg.id)) {
    void rescore?.discard();
    return;
  }
  const core = createCore(msg, model, rescore);
  core.onSpeakerTurn((turn) => {
    rescore?.observe(turn);
    post({ type: 'turn', id: msg.id, turn });
  });
  diarizers.set(msg.id, core);
  if (rescore) rescores.set(msg.id, rescore);
  post({ type: 'ready', id: msg.id, backend: model.backend ?? 'wasm' });
  for (const { chunk, startSample } of held?.chunks ?? []) pushAudio(msg.id, chunk, startSample);
}

async function initDiarizer(msg: Extract<WorkerInMessage, { type: 'init' }>): Promise<void> {
  startHoldingAudio(msg.id);
  loading += 1;
  const opening = WorkerRescore.open(msg.id, msg.source);
  try {
    const model = await loadModel().catch(async (err: unknown) => {
      disposedBeforeReady.delete(msg.id);
      takeHeldAudio(msg.id);
      await (await opening)?.discard();
      throw err;
    });
    startDiarizer(msg, model, await opening);
  } finally {
    loading -= 1;
  }
}

function pushAudio(id: string, chunk: Float32Array, startSample?: number): void {
  const core = diarizers.get(id);
  if (!core) {
    holdAudio(id, chunk, startSample);
    return;
  }
  rescores.get(id)?.pushAudio(chunk, startSample);
  core.push(chunk, startSample);
}

async function flushDiarizer(id: string): Promise<void> {
  const core = diarizers.get(id);
  if (!core) {
    post({ type: 'flushed', id });
    return;
  }
  await core.flush();
  const snapshot = core.snapshotSpeakers();
  const speakerState = snapshot.numFrames > 0 ? serializeSpeakerState(snapshot, SPEAKER_SHAPE) : undefined;
  core.dispose();
  if (diarizers.delete(id)) flushedIds.add(id);
  const rescore = rescores.get(id);
  rescores.delete(id);
  if (!rescore || !(await shouldRescore(rescore))) {
    await rescore?.discard();
    post({ type: 'flushed', id, speakerState });
    return;
  }
  post({ type: 'flushed', id, speakerState, rescoring: true });
  void runRescore(id, rescore, () => loading === 0 && diarizers.size === 0, post);
}

function disposeDiarizer(id: string): void {
  if (!diarizers.has(id) && !flushedIds.delete(id)) disposedBeforeReady.add(id);
  takeHeldAudio(id);
  diarizers.get(id)?.dispose();
  diarizers.delete(id);
  void rescores.get(id)?.discard();
  rescores.delete(id);
}

async function dispatchMessage(msg: WorkerInMessage): Promise<void> {
  switch (msg.type) {
    case 'init':
      return initDiarizer(msg);
    case 'push':
      pushAudio(msg.id, msg.chunk, msg.startSample);
      return;
    case 'flush':
      return flushDiarizer(msg.id);
    case 'dispose':
      disposeDiarizer(msg.id);
      return;
  }
}

ctx.onmessage = (ev) => {
  const msg = ev.data;
  dispatchMessage(msg).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    const code: DiarizerErrorCode = err instanceof NotCachedError ? 'not-cached' : 'failed';
    post({ type: 'error', id: msg.id, message, code });
  });
};
