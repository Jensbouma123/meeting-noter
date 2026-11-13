import { subscribe } from './store-core';
import { getTranscriptSessionId, isCaptureActive } from './transcript-session';

export const subscribeLiveSession = subscribe;

export function getLiveSessionId(): string | null {
  return isCaptureActive() ? getTranscriptSessionId() : null;
}
