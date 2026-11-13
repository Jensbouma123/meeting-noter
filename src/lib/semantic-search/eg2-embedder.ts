import type { EmbeddingGemma2 } from '../embeddinggemma2/types';
import { EMBEDDING_DIM, type Embedder } from './types';

export const QUERY_PREFIX = 'task: search result | query: ';
export const DOCUMENT_PREFIX = 'title: none | text: ';

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
