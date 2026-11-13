import type { MutableRefObject } from 'react';
import type { AsrBackend } from '@/lib/asr/browser';
import type { CHAIN } from './constants';

export type ChainKey = (typeof CHAIN)[number];

export interface ChainPosition {
  key: ChainKey;
  backend: AsrBackend;
  encoder: string | null;
}

export type BenchPhase = 'idle' | 'loading' | 'running' | 'done' | 'error';

export interface RunResult {
  run: number;
  transcribeMs: number;
  rtf: number;
  text: string;
}

export interface BenchReport {
  backend: AsrBackend;
  encoderQuant: string;
  encoderFile: string;
  audioSeconds: number;
  runs: number;
  loadMs: number;
  results: RunResult[];
  meanRtf: number;
  userAgent: string;
}

export interface RunOverrides {
  backend?: AsrBackend | 'auto';
  encoder?: string | null;
  runs?: number;
}

export interface BenchRunParams {
  backend: AsrBackend | 'auto';
  encoder: string | null;
  runs: number;
  clipRef: MutableRefObject<Float32Array | null>;
  appendLog: (line: string) => void;
}

export interface BenchAutostartParams {
  autostart: boolean;
  fileUrl: string | null;
  clipRef: MutableRefObject<Float32Array | null>;
  appendLog: (line: string) => void;
  setFileName: (name: string) => void;
  setPhase: (phase: BenchPhase) => void;
  setReportError: (message: string) => void;
  run: () => Promise<void>;
}

export interface BenchResultSinkParams {
  autostart: boolean;
  phase: BenchPhase;
  benchResult: Record<string, unknown>;
  variant: string;
  next: string | null;
  appendLog: (line: string) => void;
}
