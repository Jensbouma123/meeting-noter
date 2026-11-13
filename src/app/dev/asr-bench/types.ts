import type { AsrBackend } from '@/lib/asr/browser';
import type { CHAIN } from './constants';

export type ChainKey = (typeof CHAIN)[number];

export interface ChainPosition {
  key: ChainKey;
  backend: AsrBackend;
  encoder: string | null;
}
