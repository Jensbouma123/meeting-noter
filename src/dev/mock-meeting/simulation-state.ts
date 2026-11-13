import type { Levels, MeetingState } from '@/lib/meeting';
import { INITIAL_STATE } from './constants';
import type { MockSimulation } from './types';

export const simulation: MockSimulation = {
  state: { ...INITIAL_STATE },
  streamTimer: null,
  langTimer: null,
  turnIndex: 0,
  wordIndex: 0,
  segmentId: 0,
  activeSpeakerId: null,
  isPaused: false,
  rafId: null,
  currentLevels: { mic: 0, system: 0 },
};

export const stateListeners = new Set<() => void>();
export const levelListeners = new Set<(l: Levels) => void>();

export function updateState(partial: Partial<MeetingState>): void {
  simulation.state = { ...simulation.state, ...partial };
  for (const listener of stateListeners) {
    listener();
  }
}

export function isRunning(): boolean {
  return simulation.state.status === 'live' || simulation.state.status === 'paused';
}
