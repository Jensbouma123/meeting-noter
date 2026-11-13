import type { SemanticIndex } from './index';
import type { Embedder, KeyValueStore } from './types';

export interface CachedIndex {
  signature: string;
  embedder: Embedder;
  store: KeyValueStore | null | undefined;
  index: SemanticIndex;
}
