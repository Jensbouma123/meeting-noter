import { createEmbeddingGemma2 } from '../embeddinggemma2';
import type { EmbeddingGemma2 } from '../embeddinggemma2/types';
import { createEg2Embedder } from './eg2-embedder';
import { toWorkerProgress } from './embed-progress';
import { buildIndexRecord } from './index-record';
import type { EmbedWorkerIn, EmbedWorkerOut, Embedder } from './types';

export function createEmbedHandler(
  makeEg2: (onProgress: (info: unknown) => void) => Pick<EmbeddingGemma2, 'embedText'> = (onProgress) =>
    createEmbeddingGemma2({ onProgress }),
  onProgress: (info: unknown) => void = () => {},
): (msg: EmbedWorkerIn) => Promise<EmbedWorkerOut> {
  let embedder: Embedder | null = null;
  return async (msg) => {
    const { id } = msg;
    try {
      embedder ??= createEg2Embedder(makeEg2(onProgress));
      if ('kind' in msg)
        return {
          id,
          record: await buildIndexRecord(msg.meetingId, msg.lines, embedder),
        };
      return { id, vectors: await embedder.embed(msg.texts, msg.role) };
    } catch (err) {
      return { id, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

function transferables(out: EmbedWorkerOut): Transferable[] {
  if ('vectors' in out) return out.vectors.map((v) => v.buffer);
  if ('record' in out && out.record?.centroid) return [out.record.centroid.buffer];
  return [];
}

if (typeof self !== 'undefined') {
  const handle = createEmbedHandler(undefined, (info) => {
    const progress = toWorkerProgress(info);
    if (progress) (self as unknown as Worker).postMessage({ progress });
  });
  self.onmessage = async (e: MessageEvent<EmbedWorkerIn>) => {
    const out = await handle(e.data);
    const transfer = transferables(out);
    (self as unknown as Worker).postMessage(out, transfer);
  };
}
