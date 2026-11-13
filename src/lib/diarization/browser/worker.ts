import { DEFAULT_MODE, REALTIME_MODE } from './constants';
import { DiarizerCore } from './core';
import { HIDDEN_SIZE, NUM_SPEAKERS } from './manifest';
import { Mutex } from './mutex';
import type { SortformerModel } from './sortformer-model';
import { deserializeSpeakerState, serializeSpeakerState } from './speaker-state';
import type { DiarizerErrorCode, WorkerInMessage, WorkerOutMessage } from './types';
import { NotCachedError, loadModel } from './worker-model';
import { holdAudio, startHoldingAudio, takeHeldAudio } from './worker-pending-audio';

const ctx = self as unknown as {
  postMessage(message: WorkerOutMessage): void;
  onmessage: ((ev: MessageEvent<WorkerInMessage>) => void) | null;
};

const modelMutex = new Mutex();
const SHAPE = { hiddenSize: HIDDEN_SIZE, numSpeakers: NUM_SPEAKERS };
const diarizers = new Map<string, DiarizerCore>();
const disposedBeforeReady = new Set<string>();

function logStepTiming(source: string, backend: string | null, audioSec: number, inferMs: number): void {
  console.debug(
    `[diarization] ${source} step ${audioSec.toFixed(2)} s audio in ${inferMs.toFixed(0)} ms ` +
      `(${backend}, RTF ${(inferMs / 1000 / audioSec).toFixed(2)})`,
  );
}

function createCore(msg: Extract<WorkerInMessage, { type: 'init' }>, model: SortformerModel): DiarizerCore {
  return new DiarizerCore({
    source: msg.source,
    model: { run: (...args) => modelMutex.run(() => model.run(...args)) },
    mode: model.backend === 'webgpu' ? REALTIME_MODE : DEFAULT_MODE,
    turns: { provisional: true },
    speakerState: msg.speakerState ? deserializeSpeakerState(msg.speakerState, SHAPE) : null,
    onStep: msg.debug
      ? (audioSec, inferMs) => logStepTiming(msg.source, model.backend, audioSec, inferMs)
      : undefined,
  });
}

async function initDiarizer(msg: Extract<WorkerInMessage, { type: 'init' }>): Promise<void> {
  startHoldingAudio(msg.id);
  let model: SortformerModel;
  try {
    model = await loadModel();
  } catch (err) {
    disposedBeforeReady.delete(msg.id);
    takeHeldAudio(msg.id);
    throw err;
  }
  const held = takeHeldAudio(msg.id);
  if (disposedBeforeReady.delete(msg.id)) return;
  const core = createCore(msg, model);
  core.onSpeakerTurn((turn) => ctx.postMessage({ type: 'turn', id: msg.id, turn }));
  diarizers.set(msg.id, core);
  ctx.postMessage({ type: 'ready', id: msg.id, backend: model.backend ?? 'wasm' });
  for (const { chunk, startSample } of held?.chunks ?? []) core.push(chunk, startSample);
}

async function flushDiarizer(id: string): Promise<void> {
  const core = diarizers.get(id);
  if (!core) {
    ctx.postMessage({ type: 'flushed', id });
    return;
  }
  await core.flush();
  const snapshot = core.snapshotSpeakers();
  ctx.postMessage({
    type: 'flushed',
    id,
    speakerState: snapshot.numFrames > 0 ? serializeSpeakerState(snapshot, SHAPE) : undefined,
  });
}

function disposeDiarizer(id: string): void {
  if (!diarizers.has(id)) disposedBeforeReady.add(id);
  takeHeldAudio(id);
  diarizers.get(id)?.dispose();
  diarizers.delete(id);
}

async function dispatchMessage(msg: WorkerInMessage): Promise<void> {
  switch (msg.type) {
    case 'init':
      return initDiarizer(msg);
    case 'push': {
      const core = diarizers.get(msg.id);
      if (core) core.push(msg.chunk, msg.startSample);
      else holdAudio(msg.id, msg.chunk, msg.startSample);
      return;
    }
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
    ctx.postMessage({ type: 'error', id: msg.id, message, code });
  });
};
