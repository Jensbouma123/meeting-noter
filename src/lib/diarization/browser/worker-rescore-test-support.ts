import type { SpeakerTurn } from './types';
import { loadState } from './worker-test-support';

export const rescoreState = {
  open: true,
  gateOpen: false,
  fail: false,
  turns: [] as SpeakerTurn[],
  audio: 0,
  discarded: [] as string[],
  modelDisposedAtRun: -1,
  embedderDisposed: 0,
};

export function resetRescoreState(): void {
  Object.assign(rescoreState, {
    open: true,
    gateOpen: false,
    fail: false,
    turns: [],
    audio: 0,
    discarded: [],
    modelDisposedAtRun: -1,
    embedderDisposed: 0,
  });
  loadState.modelDisposed = 0;
  loadState.embedderCached = true;
}

export const workerRescoreMock = {
  WorkerRescore: class {
    constructor(readonly id: string) {}
    static async open(id: string) {
      return rescoreState.open ? new this(id) : null;
    }
    get gateOpen() {
      return rescoreState.gateOpen;
    }
    pushAudio() {
      rescoreState.audio += 1;
    }
    pushProbs() {}
    observe() {}
    async run() {
      rescoreState.modelDisposedAtRun = loadState.modelDisposed;
      if (rescoreState.fail) throw new Error('rescore broke');
      return rescoreState.turns;
    }
    async discard() {
      rescoreState.discarded.push(this.id);
    }
  },
};

export const embedderMock = {
  SpeakerEmbedder: class {
    async dispose() {
      rescoreState.embedderDisposed += 1;
    }
  },
};
