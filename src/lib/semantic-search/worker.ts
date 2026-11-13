import { createEmbeddingGemma2 } from '../embeddinggemma2';
import type { EmbeddingGemma2 } from '../embeddinggemma2/types';
import { createEg2Embedder } from './eg2-embedder';
import type { EmbedWorkerIn, EmbedWorkerOut, Embedder } from './types';

export function createEmbedHandler(
  makeEg2: () => Pick<EmbeddingGemma2, 'embedText'> = () => createEmbeddingGemma2(),
): (msg: EmbedWorkerIn) => Promise<EmbedWorkerOut> {
  let embedder: Embedder | null = null;
  return async ({ id, texts, role }) => {
    try {
      embedder ??= createEg2Embedder(makeEg2());
      return { id, vectors: await embedder.embed(texts, role) };
    } catch (err) {
      return { id, error: err instanceof Error ? err.message : String(err) };
    }
  };
}
if (typeof self !== 'undefined') {
  const handle = createEmbedHandler();
  self.onmessage = async (e: MessageEvent<EmbedWorkerIn>) => {
    const out = await handle(e.data);
    const transfer = 'vectors' in out ? out.vectors.map((v) => v.buffer) : [];
    (self as unknown as Worker).postMessage(out, transfer);
  };
}
