import type { AsrEngineTestState } from './types/asr-test';

export function createEngineState(): AsrEngineTestState {
  return {
    failLoad: false,
    failLoadForEncoder: null,
    failTranscribe: false,
    load: { files: 3, hold: false },
    failLoadMessage: 'session creation exploded',
    instances: [],
    encoderQuants: [],
    transcribed: [],
    recognized: [],
    words: null,
    hold: null,
    loadGate: null,
    transcribeWords: null,
  };
}

export function resetEngineState(state: AsrEngineTestState): void {
  state.failLoad = false;
  state.failLoadForEncoder = null;
  state.failTranscribe = false;
  state.load = { files: 3, hold: false };
  state.failLoadMessage = 'session creation exploded';
  state.instances.length = 0;
  state.encoderQuants.length = 0;
  state.transcribed.length = 0;
  state.recognized.length = 0;
  state.words = null;
  state.transcribeWords = null;
  state.hold = null;
  state.loadGate = null;
}
