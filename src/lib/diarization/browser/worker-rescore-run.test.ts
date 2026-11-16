import { beforeEach, describe, expect, it, vi } from 'vitest';

const support = await vi.hoisted(() => import('./worker-test-support'));
const rescoreSupport = await vi.hoisted(() => import('./worker-rescore-test-support'));

vi.mock('./downloader', () => support.downloaderMock);
vi.mock('./sortformer-model', () => support.sortformerModelMock);
vi.mock('./core', () => support.coreMock);
vi.mock('./worker-rescore', () => rescoreSupport.workerRescoreMock);
vi.mock('./rescore/embedder', () => rescoreSupport.embedderMock);

const { posted, cores, loadState, flush, loadWorker } = support;
const { rescoreState, resetRescoreState } = rescoreSupport;
const TURNS = [{ speaker: 'mic:0', source: 'mic' as const, start: 0, end: 1, final: true }];

async function flushedSession(id: string) {
  const send = await loadWorker();
  send({ type: 'init', id, source: 'mic' });
  await flush();
  loadState.releaseLoad();
  await flush();
  send({ type: 'push', id, chunk: new Float32Array(160), startSample: 0 });
  send({ type: 'push', id, chunk: new Float32Array(160), startSample: 160 });
  send({ type: 'flush', id });
  await flush();
  return send;
}

describe('diarization worker rescore', () => {
  beforeEach(() => {
    posted.length = 0;
    cores.length = 0;
    loadState.failLoad = false;
    resetRescoreState();
    vi.resetModules();
  });

  it('flushes without rescoring and discards the spill when the gate stays closed', async () => {
    await flushedSession('a');
    expect(posted.filter((m) => m.type !== 'ready')).toEqual([{ type: 'flushed', id: 'a' }]);
    expect(rescoreState.discarded).toEqual(['a']);
    expect(loadState.modelDisposed).toBe(0);
    vi.unstubAllGlobals();
  });

  it('flushes without rescoring when the speaker embedder is not downloaded', async () => {
    rescoreState.gateOpen = true;
    loadState.embedderCached = false;
    await flushedSession('b');
    expect(posted.filter((m) => m.type !== 'ready')).toEqual([{ type: 'flushed', id: 'b' }]);
    expect(rescoreState.discarded).toEqual(['b']);
    expect(rescoreState.modelDisposedAtRun).toBe(-1);
    vi.unstubAllGlobals();
  });

  it('frees the streaming model, rescores, then posts the rescored turns', async () => {
    rescoreState.gateOpen = true;
    rescoreState.turns = TURNS;
    const send = await flushedSession('c');
    send({ type: 'dispose', id: 'c' });
    await flush();
    expect(posted.filter((m) => m.type !== 'ready')).toEqual([
      { type: 'flushed', id: 'c', rescoring: true },
      { type: 'rescored', id: 'c', turns: TURNS },
    ]);
    expect(rescoreState.audio).toBe(2);
    expect(rescoreState.modelDisposedAtRun).toBe(1);
    expect(rescoreState.embedderDisposed).toBe(1);
    expect(rescoreState.discarded).toEqual(['c']);
    vi.unstubAllGlobals();
  });

  it('posts rescored without turns, and no error, when rescoring throws', async () => {
    rescoreState.gateOpen = true;
    rescoreState.fail = true;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await flushedSession('d');
    expect(posted.filter((m) => m.type !== 'ready')).toEqual([
      { type: 'flushed', id: 'd', rescoring: true },
      { type: 'rescored', id: 'd', turns: undefined },
    ]);
    expect(posted.some((m) => m.type === 'error')).toBe(false);
    expect(rescoreState.discarded).toEqual(['d']);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
