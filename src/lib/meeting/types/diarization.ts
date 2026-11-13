export type DiarizationPhase = 'off' | 'waiting' | 'loading' | 'active' | 'unavailable';

export interface DiarizationStatus {
  phase: DiarizationPhase;
  reason: string | null;
  backend?: 'webgpu' | 'wasm';
}
