// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initRegistry, markCached, markNotCached } from '@/lib/asr/browser';
import { backfillIndex } from './backfill';
import { isSearchModelReady, onSearchModelReady } from './model-gate';
import { registerSearchModel, SEARCH_REGISTRY_KEY } from './model-registry';
import { SearchModelNotReadyError, searchMeetings, withEmbedder } from './service';

vi.stubGlobal('caches', undefined);

describe('search model gate', () => {
  beforeEach(() => {
    localStorage.clear();
    initRegistry();
    registerSearchModel();
    markNotCached(SEARCH_REGISTRY_KEY);
  });

  it('refuses to start an embedder before the model is downloaded', async () => {
    const run = vi.fn();
    await expect(withEmbedder(run)).rejects.toBeInstanceOf(SearchModelNotReadyError);
    expect(run).not.toHaveBeenCalled();
  });

  it('backfill does nothing and library search is empty without the model', async () => {
    const listMeetingIds = vi.fn(() => ['a']);
    expect(await backfillIndex({ listMeetingIds })).toEqual({ total: 0, done: 0, failed: 0, aborted: false });
    expect(listMeetingIds).not.toHaveBeenCalled();
    expect(await searchMeetings('hello')).toEqual([]);
  });

  it('allows the embedder and notifies once the model is cached', async () => {
    const onReady = vi.fn();
    const off = onSearchModelReady(onReady);
    markCached(SEARCH_REGISTRY_KEY);
    off();
    expect(isSearchModelReady()).toBe(true);
    expect(onReady).toHaveBeenCalledTimes(1);
    await expect(withEmbedder(async () => 'ok')).resolves.toBe('ok');
  });
});
