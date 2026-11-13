import type { ContextBiaser } from '../../../vocabulary/bias';
import type { BrowserWord } from './word';

export interface OrtTensorLike {
  readonly data: unknown;
  readonly dims: readonly number[];
  dispose?: () => void;
}

export interface OrtLike {
  Tensor: new (
    type: 'float32' | 'int64',
    data: Float32Array | BigInt64Array,
    dims: readonly number[],
  ) => OrtTensorLike;
}

export interface SessionLike {
  run(feeds: Record<string, OrtTensorLike>): Promise<Record<string, OrtTensorLike>>;
}

export interface NemotronSessions {
  encoder: SessionLike;
  decoder: SessionLike;
  joint: SessionLike;
}

export interface NemotronToken {
  id: number;
  frame: number;
  logProb: number;
}

export interface NemotronResult {
  text: string;
  words: BrowserWord[];
  tokens: NemotronToken[];
  firstTokenMs: number | null;
}

export interface NemotronRecognizeOptions {

  langId?: number;

  flushChunks?: number;

  leadSeconds?: number;

  onChunk?: (index: number, total: number) => void;

  biaser?: ContextBiaser | null;
}
