/**
 * PostMessage protocol and shared input/output contracts for the LiquidAI D1
 * Web Worker (`worker.ts`) and lazy singleton client (`client.ts`).
 */

import type { SessionBackend } from './onnx-session';
import type { D1Answer, D1Question } from './prompt';

export interface D1DecisionRequest {
  state: string | Record<string, unknown>;
  question: D1Question;
}

export type D1WorkerErrorCode = 'not-cached' | 'failed' | 'disposed';

export type D1WorkerInMessage =
  | { type: 'init'; id: string }
  | { type: 'decide'; id: string; requests: D1DecisionRequest[]; maxTokens?: number }
  | { type: 'dispose'; id: string };

/**
 * Where a decide batch is: loading model files, starting the ONNX session,
 * sending batch `batch` (1-based), or waiting for the model to answer.
 */
export type D1Stage =
  | { kind: 'loading' }
  | { kind: 'session' }
  | { kind: 'sending'; batch: number }
  | { kind: 'waiting' };

export type D1WorkerOutMessage =
  | { type: 'ready'; id: string; backend: SessionBackend }
  | { type: 'result'; id: string; answers: D1Answer[]; backend: SessionBackend }
  | { type: 'disposed'; id: string }
  | { type: 'stage'; id: string; stage: D1Stage }
  /** A `[D1]` diagnostic line from inside the worker; the client prints it in the page console. */
  | { type: 'log'; id?: string; args: unknown[] }
  | { type: 'error'; id: string; message: string; code: D1WorkerErrorCode };

/** Segment shape accepted by the D1 client (compatible with `Segment`). */
export interface D1SegmentInput {
  id: string;
  speaker: string;
  text: string;
  start: number;
  end: number;
  lowConfSpans?: ReadonlyArray<readonly [startChar: number, endChar: number, conf: number]>;
}

export interface D1TriageSpanResult {
  startChar: number;
  endChar: number;
  conf: number;
  errorProbability: number;
  coherenceScore: number;
  flagged: boolean;
  suggestion: string | null;
}

export interface D1TriageResult {
  segmentId: string;
  errorProbability: number;
  coherenceScore: number;
  flagged: boolean;
  reviewedSpans: D1TriageSpanResult[];
}

export interface D1DetectedDecision {
  text: string;
  segmentIds: string[];
  start: number;
  confidence: number;
}

export interface D1DetectedActionItem {
  text: string;
  segmentIds: string[];
  start: number;
  owner: string | null;
  confidence: number;
}

export type D1WindowLabel = 'decision' | 'action_item' | 'question' | 'blocker' | 'discussion';

export interface D1WindowClassification {
  segmentIds: string[];
  start: number;
  label: D1WindowLabel;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface D1DecisionsResult {
  decisions: D1DetectedDecision[];
  actionItems: D1DetectedActionItem[];
  windows: D1WindowClassification[];
}

export interface D1TurnVerificationResult {
  segmentId: string;
  prevSegmentId: string;
  sameSpeakerProbability: number;
  suspectSpeaker: boolean;
}
