import { DEFAULT_MODE, REALTIME_MODE } from './constants';
import { DiarizerCore } from './core';
import { HIDDEN_SIZE, NUM_SPEAKERS } from './manifest';
import { Mutex } from './mutex';
import type { SortformerModel } from './sortformer-model';
import { deserializeSpeakerState } from './speaker-state';
import type { WorkerInMessage } from './types';
import type { WorkerRescore } from './worker-rescore';

export const SPEAKER_SHAPE = Object.freeze({ hiddenSize: HIDDEN_SIZE, numSpeakers: NUM_SPEAKERS });

const modelMutex = new Mutex();

function logStepTiming(source: string, backend: string | null, audioSec: number, inferMs: number): void {
  console.debug(
    `[diarization] ${source} step ${audioSec.toFixed(2)} s audio in ${inferMs.toFixed(0)} ms ` +
      `(${backend}, RTF ${(inferMs / 1000 / audioSec).toFixed(2)})`,
  );
}

export function createCore(
  msg: Extract<WorkerInMessage, { type: 'init' }>,
  model: SortformerModel,
  rescore: WorkerRescore | null,
): DiarizerCore {
  return new DiarizerCore({
    source: msg.source,
    model: { run: (...args) => modelMutex.run(() => model.run(...args)) },
    mode: model.backend === 'webgpu' ? REALTIME_MODE : DEFAULT_MODE,
    turns: { provisional: true },
    speakerState: msg.speakerState ? deserializeSpeakerState(msg.speakerState, SPEAKER_SHAPE) : null,
    onStep: msg.debug ? (audioSec, inferMs) => logStepTiming(msg.source, model.backend, audioSec, inferMs) : undefined,
    onProbabilities: rescore ? (probs) => rescore.pushProbs(probs) : undefined,
  });
}
