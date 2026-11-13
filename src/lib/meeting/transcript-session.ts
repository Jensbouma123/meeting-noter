import { clearPendingAppend } from './append-mode';
import { getState } from './store-core';

let transcriptSessionId: string | null = null;

export function getTranscriptSessionId(): string | null {
  return transcriptSessionId;
}

export function setTranscriptSessionId(sessionId: string | null): void {
  transcriptSessionId = sessionId;
}

export function bindTranscriptSession(sessionId: string | null): void {
  clearPendingAppend();
  transcriptSessionId = sessionId;
}

export function isCaptureActive(): boolean {
  const { status } = getState();
  return status !== 'idle' && status !== 'error';
}
