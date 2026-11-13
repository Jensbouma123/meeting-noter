import type { AsrBackend, AsrEngine, InitProgress } from '@/lib/asr/browser';
import type { Source } from './basics';
import type { BrowserASRProgress } from './asr-progress';
import type { SpeakerLabeler, SpeakerTimeline } from './asr-speaker';

export type RecordingMode = 'live' | 'post-stop';

export type BrowserErrorKind = 'load' | 'transcribe';

export interface FetchProgress {
  loadedBytes: number;
  totalBytes: number;
  file: string;
}

export interface UndecidedFrame {
  source: Source;
  pcm: ArrayBuffer;
  startSample?: number;
}

export interface WindowInFlight {
  source: Source;
  startSample: number;
  samples: number;
}

export interface BrowserAsrState {
  enabled: boolean;
  engine: AsrEngine | null;
  loading: boolean;
  ready: boolean;
  failed: boolean;
  error: string | null;
  errorKind: BrowserErrorKind | null;
  blockedReason: string | null;
  enginePromise: Promise<AsrEngine | null> | null;
  transcribeInFlight: boolean;
  previousLoadCrashed: boolean;
  ownsLoadMarker: boolean;
  activeBackend: AsrBackend | null;
  recordingMode: RecordingMode | null;
  undecidedFrames: UndecidedFrame[];
  undecidedSamples: number;
  initProgress: InitProgress;
  fetchProgress: FetchProgress | null;
  progressSnapshot: BrowserASRProgress | null;
  windowInFlight: WindowInFlight | null;
  speakerLabeler: SpeakerLabeler;
  speakerTimeline: SpeakerTimeline | null;
}
