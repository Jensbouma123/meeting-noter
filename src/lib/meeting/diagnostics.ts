import { getLiveAsrFeed } from './browser-asr';
import { getDiarizationFeed } from './diarization-bridge';
import { session } from './session-state';
import type { Source } from './types';
import type { FrameFeedCounts, MeetingDiagnostics } from './types/diagnostics';

const CAPTURE_SAMPLE_RATE = 16_000;

export const captureClock = new Map<Source, number>();
export const frameFeed = new Map<Source, FrameFeedCounts>();

export function getMeetingDiagnostics(): MeetingDiagnostics | null {
  if (!session.capture) return null;
  const clock: Partial<Record<Source, number>> = {};
  for (const [source, samples] of captureClock) clock[source] = samples / CAPTURE_SAMPLE_RATE;
  return {
    capture: session.capture.diagnostics(),
    clock,
    frames: Object.fromEntries(frameFeed) as MeetingDiagnostics['frames'],
    asr: getLiveAsrFeed(),
    postStop: session.sessionPostStop,
    diarization: getDiarizationFeed(),
  };
}
