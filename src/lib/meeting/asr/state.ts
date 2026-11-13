import { emptyInitProgress } from '@/lib/asr/browser';
import type { BrowserAsrState } from '../types/asr-state';
import type { Source } from '../types/basics';

export function singleSpeakerLabel(source: Source): string {
  return `${source}:0`;
}

export const asrState: BrowserAsrState = {
  enabled: true,
  engine: null,
  loading: false,
  ready: false,
  failed: false,
  error: null,
  errorKind: null,
  blockedReason: null,
  enginePromise: null,
  transcribeInFlight: false,
  previousLoadCrashed: false,
  ownsLoadMarker: false,
  activeBackend: null,
  recordingMode: null,
  undecidedFrames: [],
  undecidedSamples: 0,
  initProgress: emptyInitProgress(),
  fetchProgress: null,
  progressSnapshot: null,
  windowInFlight: null,
  speakerLabeler: singleSpeakerLabel,
  speakerTimeline: null,
};
