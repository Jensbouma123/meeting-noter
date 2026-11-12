/** Embedding worker: owns the EmbeddingGemma 2 text model so inference never
 *  runs on the main thread. The model loads on the first request. */
import { createEmbeddingGemma2, type EmbeddingGemma2 } from '../embeddinggemma2';
import { createEg2Embedder } from './eg2-embedder';
import type { Embedder } from './types';

export type EmbedWorkerIn = { id: number; texts: string[]; role: 'query' | 'document' };
export type EmbedWorkerOut =
  | { id: number; vectors: Float32Array[] }
  | { id: number; error: string };

/** Message handler, separated from `self` so a test can drive it. */
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

// No `typeof window` guard: Next/Turbopack fold it to a constant in client bundles and
// dead-strip the whole handler. `typeof self` keeps tests (no `self`) importing this inertly.
if (typeof self !== 'undefined') {
  const handle = createEmbedHandler();
  self.onmessage = async (e: MessageEvent<EmbedWorkerIn>) => {
    const out = await handle(e.data);
    const transfer = 'vectors' in out ? out.vectors.map((v) => v.buffer) : [];
    (self as unknown as Worker).postMessage(out, transfer);
  };
}
