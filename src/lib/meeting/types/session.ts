import type { Capture } from '../capture';
import type { Source } from './basics';

export interface UndecidedFrame {
  source: Source;
  pcm: ArrayBuffer;
  at: number;
}

export interface SpeakerSession {
  id: string | null;
  append: boolean;
}

export interface SessionState {
  capture: Capture | null;
  paused: boolean;
  sessionOver: boolean;
  stopPromise: Promise<void> | null;
  sessionPostStop: boolean | null;
  undecidedFrames: UndecidedFrame[];
  backendResolved: Promise<void>;
  sawActiveCapture: boolean;
  postStopChain: Promise<void>;
  speakerSession: SpeakerSession;
}
