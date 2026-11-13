import { useSyncExternalStore } from 'react';
import type { Levels, MeetingState, StartOpts } from '@/lib/meeting';
import { applyVocabularyToSegment } from '@/lib/vocabulary/replace';
import { addFixedWord, getPreparedVocabulary } from '@/lib/vocabulary/store';
import { INITIAL_STATE } from './constants';
import { clearLangTimer, setMockLanguage } from './language';
import { runLevelsLoop, stopLevelsLoop } from './levels';
import { listMicDevices } from './mic-devices';
import { advanceSimulation } from './simulation';
import { isRunning, levelListeners, simulation, stateListeners, updateState } from './simulation-state';
import { startMockMeeting } from './start';

export function useMeeting<T>(selector: (s: MeetingState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      stateListeners.add(cb);
      return () => stateListeners.delete(cb);
    },
    () => selector(simulation.state),
    () => selector(INITIAL_STATE)
  );
}

function ensureLevelsLoopRunning(): void {
  if (typeof window !== 'undefined' && simulation.rafId === null) {
    simulation.rafId = requestAnimationFrame(runLevelsLoop);
  }
}

export const meeting = {
  start: (opts: StartOpts): Promise<void> => startMockMeeting(opts),

  async stop(): Promise<void> {
    if (simulation.streamTimer) {
      clearTimeout(simulation.streamTimer);
      simulation.streamTimer = null;
    }
    clearLangTimer();
    simulation.isPaused = false;
    simulation.activeSpeakerId = null;
    stopLevelsLoop();
    updateState({ status: 'stopping' });
    await new Promise((r) => setTimeout(r, 150));
    updateState({ status: 'idle' });
  },

  pause(): void {
    if (simulation.state.status !== 'live') return;
    simulation.isPaused = true;
    simulation.activeSpeakerId = null;
    if (simulation.streamTimer) {
      clearTimeout(simulation.streamTimer);
      simulation.streamTimer = null;
    }
    updateState({ status: 'paused' });
  },

  resume(): void {
    if (simulation.state.status !== 'paused') return;
    simulation.isPaused = false;
    updateState({ status: 'live' });
    ensureLevelsLoopRunning();
    simulation.streamTimer = setTimeout(advanceSimulation, 300);
  },

  fixWord(heard: string, word: string): void {
    if (!addFixedWord(heard, word)) return;
    const vocab = getPreparedVocabulary();
    updateState({ segments: simulation.state.segments.map((s) => (s.final ? applyVocabularyToSegment(s, vocab) : s)) });
  },

  renameSpeaker(id: string, label: string): void {
    const existing = simulation.state.speakers[id];
    if (!existing) return;
    updateState({ speakers: { ...simulation.state.speakers, [id]: { ...existing, label } } });
  },

  setLanguage: setMockLanguage,

  subscribeLevels(cb: (l: Levels) => void): () => void {
    levelListeners.add(cb);
    if (isRunning()) ensureLevelsLoopRunning();
    return () => {
      levelListeners.delete(cb);
    };
  },

  listMicDevices,
};
