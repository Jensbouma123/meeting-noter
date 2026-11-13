import type { SessionState } from './types/session';

export const session: SessionState = {
  capture: null,
  paused: false,
  sessionOver: true,
  stopPromise: null,
  sessionPostStop: null,
  undecidedFrames: [],
  backendResolved: Promise.resolve(),
  sawActiveCapture: false,
  postStopChain: Promise.resolve(),
  speakerSession: { id: null, append: false },
};
