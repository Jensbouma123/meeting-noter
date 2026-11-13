import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeWorker, WASM, WEBGPU, recorder, started } from './engine-client.test-support';

const local = vi.hoisted(() => ({ instances: [] as Array<{ config: unknown }> }));

vi.mock('./parakeet', () => ({
  BrowserASREngine: class {
    isReady = false;
    constructor(public config: unknown) {
      local.instances.push(this);
    }
    getStatus(): string {
      return 'idle';
    }
    async ensureLoaded(): Promise<void> {
      this.isReady = true;
    }
  },
}));

beforeEach(() => {
  FakeWorker.instances.length = 0;
  local.instances.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserASREngine fallback and settings', () => {
  it('runs a WebGPU model on the page when the worker scope has no WebGPU', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WEBGPU, recorder().events);
    const loaded = engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker, false);
    await loaded;

    expect(worker.terminated).toBe(true);
    expect(local.instances).toHaveLength(1);
    expect(engine.isReady).toBe(true);
  });

  it('runs the engine on the page when the worker script fails to start', async () => {
    const { createBrowserASREngine } = await import('./engine-client');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const engine = createBrowserASREngine(WASM, recorder().events);
    const loaded = engine.ensureLoaded();
    FakeWorker.instances[0].fail('SyntaxError');
    await loaded;

    expect(local.instances).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('gives the worker the word list at start and on every change, until disable()', async () => {
    const vocab = await import('@/lib/vocabulary/store');
    vocab.resetVocabularyForTests();
    vocab.addVocabularyEntries([{ word: 'Framna', variants: [] }]);
    const { createBrowserASREngine } = await import('./engine-client');
    const engine = createBrowserASREngine(WASM, recorder().events);
    void engine.ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);

    expect(worker.calls('setVocabulary').map((c) => c.args)).toEqual([
      { words: ['Framna'], strength: vocab.getVocabulary().strength },
    ]);
    vocab.addVocabularyEntries([{ word: 'Hezelaer', variants: [] }]);
    expect(worker.calls('setVocabulary').at(-1)?.args).toMatchObject({ words: ['Framna', 'Hezelaer'] });

    engine.disable();
    const sent = worker.calls('setVocabulary').length;
    vocab.addVocabularyEntries([{ word: 'Acme', variants: [] }]);
    expect(worker.calls('setVocabulary')).toHaveLength(sent);
    vocab.resetVocabularyForTests();
  });

  it('sends no word list to a worker when the list is empty', async () => {
    const vocab = await import('@/lib/vocabulary/store');
    vocab.resetVocabularyForTests();
    const { createBrowserASREngine } = await import('./engine-client');
    void createBrowserASREngine(WASM, recorder().events).ensureLoaded();
    const worker = FakeWorker.instances[0];
    await started(worker);
    expect(worker.calls('setVocabulary')).toEqual([]);
  });
});
