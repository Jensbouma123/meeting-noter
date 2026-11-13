import type { MeetingState } from './types';

export const INITIAL_STATE: MeetingState = {
  status: 'idle',
  mode: 'mic',
  startedAt: null,
  serverReady: false,
  segments: [],
  speakers: {},
  error: null,
  warning: null,
  callAudioMissing: false,
  language: null,
  stats: null,
  diarization: { phase: 'off', reason: null },
};
