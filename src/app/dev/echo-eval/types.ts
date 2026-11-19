import type { CaseResult } from '../../../../scripts/echo-eval/types/case-result';
import type { EvalCase } from '../../../../scripts/echo-eval/types/eval-case';
import type { MeetingCase } from '../../../../scripts/echo-eval/types/meeting-case';
import type { Segment } from '@/lib/meeting/types';

export interface PlanUtterance {
  id: string;
  speaker: string;
  seconds: number;
  split: 'dev' | 'heldout';
}

export interface EvalPlan {
  cases: (EvalCase | MeetingCase)[];
  utterances: number;
  done: string[];
}

export interface EvalEngine {
  backend: string;
  ensureReady: () => Promise<void>;
  asr: {
    pushLiveAudio: (source: 'mic' | 'system', frame: ArrayBuffer) => void;
    flushLiveAudio: () => Promise<unknown>;
  };
  store: {
    resetSession: (mode: 'both') => void;
    getState: () => { segments: Segment[] };
  };
}

export type EvalPhase = 'idle' | 'loading' | 'running' | 'done' | 'error';

export interface EvalProgress {
  phase: EvalPhase;
  done: number;
  total: number;
  message: string;
}

export type EvalResult = CaseResult;
