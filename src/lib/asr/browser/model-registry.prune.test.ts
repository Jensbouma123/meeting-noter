import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importFullRegistry, installLocalStorage, KEY, loadRegistry } from './model-registry.test-support';

const REGISTRY_STORAGE_KEY = 'mn.model-registry.v1';
const STALE_KEY = 'd1';

const persistedEntry = (key: string, status: string) => ({
  key,
  modelRepo: 'repo/model',
  displayName: key,
  estimatedSizeBytes: 1_000,
  backend: 'wasm',
  status,
  progress: null,
  error: null,
  wasCancelled: false,
});

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('initRegistry', () => {
  it('drops persisted entries for models the app no longer registers and rewrites storage', async () => {
    vi.stubGlobal('window', {});
    const store = installLocalStorage();
    store.set(
      REGISTRY_STORAGE_KEY,
      JSON.stringify({
        [KEY]: persistedEntry(KEY, 'cached'),
        [STALE_KEY]: persistedEntry(STALE_KEY, 'cached'),
      }),
    );
    const registry = await importFullRegistry();

    registry.initRegistry();

    expect(registry.getModelStatus(STALE_KEY)).toBeUndefined();
    expect(registry.getModelStatus(KEY)).toMatchObject({ status: 'cached', isReady: true });
    const rewritten = JSON.parse(store.get(REGISTRY_STORAGE_KEY)!);
    expect(Object.keys(rewritten)).toEqual([KEY]);
  });

  it('keeps a download that is still running when it runs again after navigation', async () => {
    vi.stubGlobal('window', {});
    installLocalStorage();
    const registry = await loadRegistry();
    registry.markDownloading(KEY, 1_000);
    registry.updateProgress(KEY, 400, 1_000, 'encoder.onnx', 0, 0);

    registry.initRegistry();

    expect(registry.getModelStatus(KEY)).toMatchObject({
      status: 'downloading',
      progress: { loadedBytes: 400, totalBytes: 1_000 },
    });
  });
});
