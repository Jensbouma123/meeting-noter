import { createEmbeddingGemma2 } from '../embeddinggemma2';
import type { EmbeddingGemma2 } from '../embeddinggemma2/types';
import { createEg2Embedder } from './eg2-embedder';
import { toWorkerProgress } from './embed-progress';
import type { EmbedWorkerIn, EmbedWorkerOut, Embedder } from './types';

export function createEmbedHandler(
  makeEg2: (onProgress: (info: unknown) => void) => Pick<EmbeddingGemma2, 'embedText'> = (onProgress) =>
    createEmbeddingGemma2({ onProgress }),
  onProgress: (info: unknown) => void = () => {},
): (msg: EmbedWorkerIn) => Promise<EmbedWorkerOut> {
  let embedder: Embedder | null = null;
  return async ({ id, texts, role }) => {
    try {
      embedder ??= createEg2Embedder(makeEg2(onProgress));
      return { id, vectors: await embedder.embed(texts, role) };
    } catch (err) {
      return { id, error: err instanceof Error ? err.message : String(err) };
    }
  };
}
if (typeof self !== 'undefined') {
  const handle = createEmbedHandler(undefined, (info) => {
    const progress = toWorkerProgress(info);
    if (progress) (self as unknown as Worker).postMessage({ progress });
  });
  self.onmessage = async (e: MessageEvent<EmbedWorkerIn>) => {
    const out = await handle(e.data);
    const transfer = 'vectors' in out ? out.vectors.map((v) => v.buffer) : [];
    (self as unknown as Worker).postMessage(out, transfer);
  };
}
