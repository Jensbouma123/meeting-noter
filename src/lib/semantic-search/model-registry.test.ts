// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, initRegistry, markCached } from '@/lib/asr/browser';
import { EG2_MODEL_ID } from '../embeddinggemma2/constants';
import { reportEmbedFailed, reportEmbedProgress, reportEmbedReady } from './embed-progress';
import { SEARCH_REGISTRY_KEY, registerSearchModel, syncFromCache } from './model-registry';

function stubCache(urls: string[] | null) {
  vi.stubGlobal('caches', {
    has: async () => urls !== null,
    open: async () => ({ keys: async () => (urls ?? []).map((url) => ({ url })) }),
  });
}

const status = () => getState().entries[SEARCH_REGISTRY_KEY]?.status;

describe('search model registry entry', () => {
  beforeEach(() => {
    localStorage.clear();
    stubCache(null);
    initRegistry();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts not downloaded when the cache is empty', async () => {
    registerSearchModel();
    await syncFromCache();
    expect(status()).toBe('not-downloaded');
  });

  it('is ready when transformers-cache holds the model files', async () => {
    const base = `https://huggingface.co/${EG2_MODEL_ID}/resolve/main`;
    stubCache([`${base}/config.json`, `${base}/onnx/model_q4.onnx`]);
    registerSearchModel();
    await syncFromCache();
    expect(status()).toBe('cached');
  });

  it('follows worker progress, then ready', () => {
    registerSearchModel();
    reportEmbedProgress('onnx/model_q4.onnx', 50, 200);
    expect(status()).toBe('downloading');
    expect(getState().entries[SEARCH_REGISTRY_KEY].progress.percent).toBe(25);
    reportEmbedProgress('onnx/model_q4.onnx', 200, 200);
    reportEmbedReady();
    expect(status()).toBe('cached');
  });

  it('fails when the worker fails mid-download', () => {
    registerSearchModel();
    reportEmbedProgress('onnx/model_q4.onnx', 10, 200);
    reportEmbedFailed('network down');
    expect(status()).toBe('failed');
    expect(getState().entries[SEARCH_REGISTRY_KEY].error).toBe('network down');
  });

  it('keeps a cached model cached, never flipping to downloading, when a cached load reports progress', () => {
    registerSearchModel();
    markCached(SEARCH_REGISTRY_KEY);
    reportEmbedProgress('onnx/model_q4.onnx', 200, 200);
    expect(status()).toBe('cached');
    reportEmbedReady();
    expect(status()).toBe('cached');
  });

  it('shows the dialog once when the model is uncached and never consented', () => {
    registerSearchModel();
    expect(status()).toBe('not-downloaded');
    expect(getState().dialogVisible).toBe(true);
  });
});
