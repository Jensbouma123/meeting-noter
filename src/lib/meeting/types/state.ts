import type { CaptureMode, LanguageInfo, Stats, Status } from './basics';
import type { DiarizationStatus } from './diarization';
import type { Segment, Speaker } from './segment';

export interface MeetingState {
  status: Status;
  mode: CaptureMode;
  startedAt: number | null;
  serverReady: boolean;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  error: string | null;
  warning: string | null;
  callAudioMissing: boolean;
  language: LanguageInfo | null;
  stats: Stats | null;
  diarization?: DiarizationStatus;
}
