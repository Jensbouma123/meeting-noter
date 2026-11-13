import { beforeEach, describe, expect, it, vi } from 'vitest';

const support = await vi.hoisted(() => import('./worker-test-support'));

vi.mock('./downloader', () => support.downloaderMock);
vi.mock('./sortformer-model', () => support.sortformerModelMock);
vi.mock('./core', () => support.coreMock);

const { posted, cores, loadState, flush, loadWorker } = support;

describe('diarization worker', () => {
  beforeEach(() => {
    posted.length = 0;
    cores.length = 0;
    vi.resetModules();
  });

  it('reports a load failure and forgets a disposed-before-ready id (F1, F4)', async () => {
    loadState.failLoad = true;
    const send = await loadWorker();

    send({ type: 'init', id: 'a', source: 'mic' });
    send({ type: 'dispose', id: 'a' });
    await flush();
    expect(posted).toEqual([{ type: 'error', id: 'a', message: 'not downloaded', code: 'not-cached' }]);

    loadState.failLoad = false;
    send({ type: 'init', id: 'a', source: 'mic' });
    await flush();
    loadState.releaseLoad();
    await flush();
    expect(posted.some((m) => m.type === 'ready' && m.id === 'a')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('replays audio pushed while the model loaded, newest 30 s only, and says which backend', async () => {
    loadState.failLoad = false;
    loadState.backend = 'wasm';
    const send = await loadWorker();
    const { MAX_PENDING_SAMPLES } = await import('./constants');

    send({ type: 'init', id: 'b', source: 'mic' });
    const chunk = 16_000;
    const pushes = MAX_PENDING_SAMPLES / chunk + 5;
    for (let i = 0; i < pushes; i += 1) {
      send({ type: 'push', id: 'b', chunk: new Float32Array(chunk), startSample: i * chunk });
    }
    await flush();
    loadState.releaseLoad();
    await flush();

    expect(posted).toContainEqual({ type: 'ready', id: 'b', backend: 'wasm' });
    expect(cores).toHaveLength(1);
    expect(cores[0].pushed[0]).toBe(5 * chunk);
    expect(cores[0].pushed).toHaveLength(MAX_PENDING_SAMPLES / chunk);
    expect(cores[0].options.turns?.provisional).toBe(true);
    vi.unstubAllGlobals();
  });

  it('streams 2 s chunks on WebGPU and 4 s chunks on WASM', async () => {
    loadState.failLoad = false;
    const { DEFAULT_MODE, REALTIME_MODE } = await import('./constants');
    for (const [b, mode] of [['webgpu', REALTIME_MODE], ['wasm', DEFAULT_MODE]] as const) {
      vi.resetModules();
      cores.length = 0;
      loadState.backend = b;
      const send = await loadWorker();
      send({ type: 'init', id: b, source: 'mic' });
      await flush();
      loadState.releaseLoad();
      await flush();
      expect(cores[0].options.mode).toEqual(mode);
    }
    vi.unstubAllGlobals();
  });
});
