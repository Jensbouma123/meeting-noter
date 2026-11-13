import type { BrowserRecognizeResult, BrowserTranscribeResult } from './result';
import type { EngineCall } from './engine-protocol';

export type EngineCallResult = BrowserTranscribeResult | BrowserRecognizeResult | undefined;

export interface PendingCall {
  method: EngineCall['method'];
  resolve: (value: EngineCallResult) => void;
  reject: (err: Error) => void;
}
