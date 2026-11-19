import type { EvalEngine } from './types';

export function createFakeEngine(): EvalEngine {
  return {
    backend: 'fake',
    ensureReady: async () => {},
    asr: { pushLiveAudio: () => {}, flushLiveAudio: async () => {} },
    store: { resetSession: () => {}, getState: () => ({ segments: [] }) },
  };
}
