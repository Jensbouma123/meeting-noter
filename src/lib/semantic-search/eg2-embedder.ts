import type { EmbeddingGemma2 } from '../embeddinggemma2/types';
import { EMBEDDING_DIM, type Embedder } from './types';

/** Task prefixes from the EmbeddingGemma 2 README. */
export const QUERY_PREFIX = 'task: search result | query: ';
export const DOCUMENT_PREFIX = 'title: none | text: ';

/**
 * Adapts the EmbeddingGemma 2 loader to `Embedder`. The loader is lazy, so
 * constructing this loads nothing; the model downloads on the first `embed`.
 */
export function createEg2Embedder(eg2: Pick<EmbeddingGemma2, 'embedText'>): Embedder {
  return {
    dim: EMBEDDING_DIM,
    embed(texts, role = 'document') {
      return eg2.embedText(texts, {
        prefix: role === 'query' ? QUERY_PREFIX : DOCUMENT_PREFIX,
      });
    },
  };
}
