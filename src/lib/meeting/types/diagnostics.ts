import type { CaptureDiagnostics } from './capture';
import type { DiarizationFeed } from '../diarization-bridge';
import type { LiveAsrFeed } from '../browser-asr';
import type { Source } from './basics';

export interface FrameFeedCounts {
  captured: number;
  toAsr: number;
}

export interface MeetingDiagnostics {
  capture: CaptureDiagnostics;
  clock: Partial<Record<Source, number>>;
  frames: Partial<Record<Source, FrameFeedCounts>>;
  asr: Partial<Record<Source, LiveAsrFeed>>;
  postStop: boolean | null;
  diarization: Partial<Record<Source, DiarizationFeed>>;
}
