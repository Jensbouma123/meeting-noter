import type { EngineCall, EngineCallResult } from './types';
import type { BrowserRecognizeResult, BrowserTranscribeResult } from './types';

export const NOT_READY_TRANSCRIBE: BrowserTranscribeResult = { segments: [], language: null, error: 'Model not ready' };
export const NOT_READY_RECOGNIZE: BrowserRecognizeResult = { text: '', words: [], error: 'Model not ready' };

export function notReadyResultFor(method: EngineCall['method']): EngineCallResult {
  if (method === 'transcribe') return NOT_READY_TRANSCRIBE;
  if (method === 'recognize') return NOT_READY_RECOGNIZE;
  return undefined;
}
