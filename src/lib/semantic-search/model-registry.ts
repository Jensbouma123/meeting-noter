import { registerModel, registerDownloadHandler, markCached, markFailed, updateProgress, setEstimatedSize, getState, type AsrBackend } from '@/lib/asr/browser';
import { SEARCH_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';
import { markDownloading, markNotCached } from '@/lib/asr/browser/model-registry-status';
import { EG2_MODEL_ID } from '../embeddinggemma2/constants';
import { defaultDevice } from '../embeddinggemma2/default-device';
import { subscribeEmbedProgress } from './embed-progress';
import { isSearchModelCached } from './model-cache-probe';
import { withEmbedderForDownload } from './service';

export { SEARCH_REGISTRY_KEY };

export const SEARCH_MODEL_SIZE_BYTES = 200_000_000;

const loadedByFile = new Map<string, number>();
const totalByFile = new Map<string, number>();
let bridged = false;

function sum(map: Map<string, number>): number {
  let n = 0;
  for (const v of map.values()) n += v;
  return n;
}

function bridgeWorkerProgress(): void {
  if (bridged) return;
  bridged = true;
  subscribeEmbedProgress((event) => {
    if (event.kind === 'progress') {
      if (getState().entries[SEARCH_REGISTRY_KEY]?.status !== 'downloading') {
        loadedByFile.clear();
        totalByFile.clear();
        markDownloading(SEARCH_REGISTRY_KEY, SEARCH_MODEL_SIZE_BYTES);
      }
      loadedByFile.set(event.file, event.loaded);
      totalByFile.set(event.file, event.total);
      const total = Math.max(sum(totalByFile), 1);
      updateProgress(SEARCH_REGISTRY_KEY, sum(loadedByFile), total, event.file, 0, 0);
    } else if (event.kind === 'ready') {
      const total = sum(totalByFile);
      if (total > 0) setEstimatedSize(SEARCH_REGISTRY_KEY, total);
      markCached(SEARCH_REGISTRY_KEY);
    } else {
      markFailed(SEARCH_REGISTRY_KEY, event.message);
    }
  });
}

registerDownloadHandler('search', async () => {
  await withEmbedderForDownload((embedder) => embedder.embed(['warm up'], 'document'));
});

export function searchBackend(): AsrBackend {
  return defaultDevice() === 'webgpu' ? 'webgpu' : 'wasm';
}

export function registerSearchModel(): void {
  bridgeWorkerProgress();
  registerModel({
    key: SEARCH_REGISTRY_KEY,
    modelRepo: EG2_MODEL_ID,
    displayName: 'Search & insights',
    estimatedSizeBytes: SEARCH_MODEL_SIZE_BYTES,
    description:
      'Finds decisions, action items and folder suggestions, run entirely on your device. ' +
      'Optional - transcripts work without it. Downloaded once and cached in your browser.',
    preCheckCache: true,
    backend: searchBackend(),
    kind: 'search',
  });
  void syncFromCache();
}

export async function syncFromCache(): Promise<void> {
  const cached = await isSearchModelCached();
  const status = getState().entries[SEARCH_REGISTRY_KEY]?.status;
  if (cached && status !== 'cached' && status !== 'downloading') markCached(SEARCH_REGISTRY_KEY);
  if (!cached && status === 'cached') markNotCached(SEARCH_REGISTRY_KEY);
}
