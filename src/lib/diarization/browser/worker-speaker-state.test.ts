import { beforeEach, describe, expect, it, vi } from 'vitest';

const support = await vi.hoisted(() => import('./worker-test-support'));

vi.mock('./downloader', () => support.downloaderMock);
vi.mock('./sortformer-model', () => support.sortformerModelMock);
vi.mock('./core', () => support.coreMock);

const { posted, cores, loadState, flush, loadWorker } = support;

describe('diarization worker speaker state', () => {
  beforeEach(() => {
    posted.length = 0;
    cores.length = 0;
    vi.resetModules();
  });

  it('starts a core from the speaker state it is given, and reports its state on flush', async () => {
    loadState.failLoad = false;
    loadState.backend = 'wasm';
    const send = await loadWorker();
    const { serializeSpeakerState } = await import('./speaker-state');
    const embeds = new Float32Array(2 * 512).fill(0.25);
    const probs = new Float32Array(2 * 8).fill(0.5);
    const state = serializeSpeakerState({ numFrames: 2, compressed: false, embeds, probs }, { hiddenSize: 512, numSpeakers: 8 });

    send({ type: 'init', id: 'c', source: 'mic', speakerState: state });
    await flush();
    loadState.releaseLoad();
    await flush();
    expect(cores[0].options.speakerState?.numFrames).toBe(2);
    expect(Array.from(cores[0].options.speakerState!.embeds)).toEqual(Array.from(embeds));

    loadState.coreSnapshot = { numFrames: 2, compressed: false, embeds, probs };
    send({ type: 'flush', id: 'c' });
    await flush();
    expect(posted).toContainEqual({ type: 'flushed', id: 'c', speakerState: state });

    loadState.coreSnapshot = { numFrames: 0, compressed: false, embeds: new Float32Array(0), probs: new Float32Array(0) };
    posted.length = 0;
    send({ type: 'flush', id: 'c' });
    await flush();
    expect(posted).toEqual([{ type: 'flushed', id: 'c', speakerState: undefined }]);
    vi.unstubAllGlobals();
  });

  it('ignores a speaker state for another model shape', async () => {
    loadState.failLoad = false;
    const send = await loadWorker();
    const { serializeSpeakerState } = await import('./speaker-state');
    const state = serializeSpeakerState(
      { numFrames: 1, compressed: false, embeds: new Float32Array(4), probs: new Float32Array(2) },
      { hiddenSize: 4, numSpeakers: 2 },
    );
    send({ type: 'init', id: 'd', source: 'mic', speakerState: state });
    await flush();
    loadState.releaseLoad();
    await flush();
    expect(cores[0].options.speakerState).toBeNull();
    vi.unstubAllGlobals();
  });
});
