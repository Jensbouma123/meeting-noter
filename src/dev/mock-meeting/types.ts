import type { Levels, MeetingState, Source } from '@/lib/meeting';

export interface ScriptTurn {
  speakerId: string;
  source: Source;
  words: string[];
}

export interface MockSimulation {
  state: MeetingState;
  streamTimer: ReturnType<typeof setTimeout> | null;
  langTimer: ReturnType<typeof setTimeout> | null;
  turnIndex: number;
  wordIndex: number;
  segmentId: number;
  activeSpeakerId: string | null;
  isPaused: boolean;
  rafId: number | null;
  currentLevels: Levels;
}
