import type { Embedder } from '../../types';

export interface ContextVectorDeps {
  run: <T>(task: (embedder: Embedder) => Promise<T>) => Promise<T>;
}
