import type { SeparatorBackend } from '@/lib/meeting/types/overlap-separate';

export type SeparatorRequest = { id: number; type: 'warm' } | { id: number; type: 'separate'; pcm: Float32Array };

export interface SeparatorResponse {
  id: number;
  backend: SeparatorBackend;
  tracks?: [Float32Array, Float32Array];
  error?: string;
}
