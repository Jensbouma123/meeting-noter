import { EG2_MODEL_ID } from '../embeddinggemma2/constants';

const TRANSFORMERS_CACHE = 'transformers-cache';

export async function isSearchModelCached(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    if (!(await caches.has(TRANSFORMERS_CACHE))) return false;
    const cache = await caches.open(TRANSFORMERS_CACHE);
    const urls = (await cache.keys()).map((r) => r.url);
    const mine = urls.filter((u) => u.includes(EG2_MODEL_ID));
    return mine.some((u) => u.includes('.onnx')) && mine.some((u) => u.endsWith('config.json'));
  } catch {
    return false;
  }
}
