import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The bridge against the real model registry: whether a recording gets a
 * diarizer at all, and the status it shows while it does (or why it doesn't).
 * A live recording once showed one speaker for minutes with nothing saying
 * speaker detection was not running.
 */

type Turn = { speaker: string; source: 'mic' | 'system'; start: number; end: number; id?: string; final?: boolean };

const fakes = vi.hoisted(() => ({
  created: [] as string[],
  disposed: [] as string[],
  turn: new Map<string, (turn: Turn) => void>(),
  ready: new Map<string, (info: { backend: 'webgpu' | 'wasm' }) => void>(),
  error: new Map<string, (message: string, code: 'not-cached' | 'failed') => void>(),
  retried: [] as string[],
}));

vi.mock('@/lib/asr/browser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/asr/browser')>();
  return {
    ...actual,
    // The download itself is the download manager's; here it only needs to
    // have been asked for.
    retryDownload: async (key: string) => {
      fakes.retried.push(key);
      actual.markNotCached(key);
    },
  };
});

vi.mock('@/lib/diarization/browser', () => ({
  createDiarizer: ({ source }: { source: string }) => {
    fakes.created.push(source);
    return {
      push() {},
      onSpeakerTurn(cb: (turn: Turn) => void) {
        fakes.turn.set(source, cb);
        return () => {};
      },
      onReady(cb: (info: { backend: 'webgpu' | 'wasm' }) => void) {
        fakes.ready.set(source, cb);
        return () => {};
      },
      onError(cb: (message: string, code: 'not-cached' | 'failed') => void) {
        fakes.error.set(source, cb);
        return () => {};
      },
      flush: async () => {},
      dispose() {
        fakes.disposed.push(source);
      },
    };
  },
}));

const PYANNOTE_ERA_REPO =
  'csukuangfj/sherpa-onnx-pyannote-segmentation-3-0+hbredin/wespeaker-voxceleb-resnet34-LM';

async function modules() {
  const registry = await import('@/lib/asr/browser');
  const bridge = await import('./diarization-bridge');
  const store = await import('./store');
  return { registry, bridge, store };
}

/** A registry where the user consented to speaker detection and its current
 *  files are on disk. */
async function consentedAndCached() {
  const m = await modules();
  m.bridge.registerDiarizationModel('webgpu');
  m.registry.recordConsent('accepted', [m.bridge.DIARIZATION_REGISTRY_KEY]);
  m.registry.markCached(m.bridge.DIARIZATION_REGISTRY_KEY);
  return m;
}

beforeEach(async () => {
  fakes.created.length = 0;
  fakes.disposed.length = 0;
  fakes.retried.length = 0;
  fakes.turn.clear();
  fakes.ready.clear();
  fakes.error.clear();
  const { registry, store } = await modules();
  registry.resetAllEntries();
  registry.resetConsent();
  store.resetSession('mic');
});

afterEach(async () => {
  const { bridge } = await modules();
  bridge.resetDiarization();
});

describe('diarization bridge — registry identity', () => {
  it('drops a "cached" entry left by the pyannote-era model, so the Nemotron files get downloaded', async () => {
    const { registry, bridge } = await modules();
    // What a browser that downloaded the previous model has persisted.
    registry.registerModel({
      key: bridge.DIARIZATION_REGISTRY_KEY,
      modelRepo: PYANNOTE_ERA_REPO,
      displayName: 'Speaker detection',
      estimatedSizeBytes: 32_000_000,
      backend: 'webgpu',
      kind: 'diarization',
    });
    registry.markCached(bridge.DIARIZATION_REGISTRY_KEY);

    bridge.registerDiarizationModel('webgpu');

    const entry = registry.getModelStatus(bridge.DIARIZATION_REGISTRY_KEY)!;
    expect(entry.modelRepo).toBe(bridge.DIARIZATION_REGISTRY_IDENTITY);
    expect(entry.modelRepo).toContain('onnx-community/Nemotron-3-Diarization-ONNX');
    expect(entry.modelRepo).toContain('onnx/model_q4f16.onnx_data');
    expect(entry.status).toBe('not-downloaded');
  });
});

describe('diarization bridge — status', () => {
  it('says why there are no speakers when the model was never consented to', async () => {
    const { bridge, store } = await modules();
    bridge.registerDiarizationModel('webgpu');
    bridge.startDiarization(['mic']);
    expect(fakes.created).toEqual([]);
    expect(store.getState().diarization).toMatchObject({ phase: 'unavailable' });
    expect(store.getState().diarization?.reason).toMatch(/not downloaded/i);
  });

  it('goes loading → active (with the backend) → off', async () => {
    const { bridge, store } = await consentedAndCached();
    bridge.startDiarization(['mic']);
    expect(fakes.created).toEqual(['mic']);
    expect(store.getState().diarization?.phase).toBe('loading');

    fakes.ready.get('mic')!({ backend: 'webgpu' });
    expect(store.getState().diarization).toEqual({ phase: 'active', reason: null, backend: 'webgpu' });

    bridge.stopDiarization();
    expect(store.getState().diarization?.phase).toBe('off');
  });

  it('waits for a consented download still in progress and starts when it lands', async () => {
    const { registry, bridge, store } = await modules();
    bridge.registerDiarizationModel('webgpu');
    registry.recordConsent('accepted', [bridge.DIARIZATION_REGISTRY_KEY]);
    (await import('@/lib/asr/browser/model-registry')).markDownloading(bridge.DIARIZATION_REGISTRY_KEY, 1);

    bridge.startDiarization(['mic']);
    expect(fakes.created).toEqual([]);
    expect(store.getState().diarization?.phase).toBe('waiting');

    registry.markCached(bridge.DIARIZATION_REGISTRY_KEY);
    expect(fakes.created).toEqual(['mic']);
    expect(store.getState().diarization?.phase).toBe('loading');
  });

  it('re-downloads through the registry when the worker finds the files missing, then restarts', async () => {
    const { registry, bridge, store } = await consentedAndCached();
    bridge.startDiarization(['mic', 'system']);
    fakes.error.get('mic')!('Speaker detection model is not downloaded (onnx/model_q4f16.onnx)', 'not-cached');
    fakes.error.get('system')!('Speaker detection model is not downloaded (onnx/model_q4f16.onnx)', 'not-cached');

    expect(fakes.disposed.sort()).toEqual(['mic', 'system']);
    expect(fakes.retried).toEqual([bridge.DIARIZATION_REGISTRY_KEY]);
    expect(registry.getModelStatus(bridge.DIARIZATION_REGISTRY_KEY)!.status).toBe('not-downloaded');
    expect(store.getState().diarization?.phase).toBe('waiting');
    expect(store.getState().warning).toBeNull();

    registry.markCached(bridge.DIARIZATION_REGISTRY_KEY);
    expect(fakes.created.sort()).toEqual(['mic', 'mic', 'system', 'system']);
  });

  it('reports any other worker failure as unavailable, with the reason', async () => {
    const { bridge, store } = await consentedAndCached();
    bridge.startDiarization(['mic']);
    fakes.error.get('mic')!('WebGPU device lost', 'failed');
    expect(store.getState().diarization).toEqual({ phase: 'unavailable', reason: 'WebGPU device lost' });
    expect(fakes.retried).toEqual([]);
  });
});

describe('diarization bridge — open turns', () => {
  it('labels new speech with an open turn\'s speaker, replaces it when it grows, and cuts only at closed ends', async () => {
    const { bridge, store } = await consentedAndCached();
    const asr = await import('./browser-asr');
    const timeline = vi.spyOn(asr, 'setSpeakerTimeline');
    const labeler = vi.spyOn(asr, 'setSpeakerLabeler');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    const tl = timeline.mock.calls.at(-1)![0]!;
    const label = labeler.mock.calls.at(-1)![0]!;

    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4, id: 'mic#0', final: true });
    store.upsertSegment({ id: 's', source: 'mic', speaker: 'mic:0', text: 'hello', start: 5, end: 6, final: true });
    // mic:1 is still talking: known before they stop.
    emit({ speaker: 'mic:1', source: 'mic', start: 4.5, end: 6, id: 'mic#1', final: false });
    expect(store.getState().segments.find((s) => s.id === 's')!.speaker).toBe('mic:1');
    expect(tl.turnEnds('mic', 0, 10)).toEqual([4]);

    emit({ speaker: 'mic:1', source: 'mic', start: 4.5, end: 8, id: 'mic#1', final: true });
    expect(tl.turnEnds('mic', 0, 10)).toEqual([4, 8]);
    expect(tl.speakerFor('mic', 4.5, 8)).toBe('mic:1');
    // An older turn arriving late does not take the provisional label back.
    emit({ speaker: 'mic:0', source: 'mic', start: 1, end: 2, id: 'mic#2', final: true });
    expect(label('mic', new Float32Array(0))).toBe('mic:1');
    timeline.mockRestore();
    labeler.mockRestore();
  });
});

describe('diarization bridge — provisional labels', () => {
  const words = (text: string, start: number) =>
    text.split(' ').map((w, i) => ({ text: w, start: (start + i * 0.5) * 16000, end: (start + i * 0.5 + 0.4) * 16000 }));
  const update = (text: string, start: number, final = false) => ({
    id: 'live-1',
    text,
    startSample: start * 16000,
    endSample: (start + text.split(' ').length * 0.5) * 16000,
    final,
    words: words(text, start),
  });

  async function wired(sources: ('mic' | 'system')[]) {
    const m = await consentedAndCached();
    const asr = await import('./browser-asr');
    const { publishLiveUpdate } = await import('./speaker-attribution');
    const timeline = vi.spyOn(asr, 'setSpeakerTimeline');
    const labeler = vi.spyOn(asr, 'setSpeakerLabeler');
    m.bridge.startDiarization(sources);
    const tl = timeline.mock.calls.at(-1)![0]!;
    const label = labeler.mock.calls.at(-1)![0]!;
    timeline.mockRestore();
    labeler.mockRestore();
    const publish = (source: 'mic' | 'system', u: ReturnType<typeof update>) =>
      publishLiveUpdate(source, u, tl, () => label(source, new Float32Array(0)));
    const line = () => m.store.getState().segments.map((s) => [s.id, s.speaker]);
    return { ...m, publish, line };
  }

  it('labels a line from its capture source the moment it is published, before any turn', async () => {
    const { store, publish, line } = await wired(['mic', 'system']);
    store.resetSession('both');
    publish('mic', update('hello there', 1));
    expect(line()).toEqual([['live-1', 'mic:0']]);
    expect(store.getState().speakers['mic:0'].label).toBe('You');
  });

  it('labels a call line with the last call speaker seen, then refines it in place when its turn arrives', async () => {
    const { store, publish, line } = await wired(['system']);
    store.resetSession('both');
    const emit = fakes.turn.get('system')!;
    emit({ speaker: 'system:2', source: 'system', start: 0, end: 4, id: 'system#0', final: true });
    publish('system', update('so what now', 5));
    expect(line()).toEqual([['live-1', 'system:2']]);

    // The next speaker's open turn covers the line: same line, new label.
    emit({ speaker: 'system:3', source: 'system', start: 4.8, end: 6.4, id: 'system#1', final: false });
    expect(line()).toEqual([['live-1', 'system:3']]);
    // Partials and the close keep the refined label rather than the guess;
    // "then" (6.5 s), past the turn's end, is a pending part of its own…
    const pending = () => store.getState().segments.map((s) => !!s.unconfirmed);
    publish('system', update('so what now then', 5));
    expect(line()).toEqual([['live-1', 'system:3'], ['live-1~3', 'system:3']]);
    expect(pending()).toEqual([false, true]);
    publish('system', update('so what now then', 5, true));
    expect(line()).toEqual([['live-1', 'system:3'], ['live-1~3', 'system:3']]);
    // …until the turn reaches it.
    emit({ speaker: 'system:3', source: 'system', start: 4.8, end: 7, id: 'system#1', final: true });
    expect(line()).toEqual([['live-1', 'system:3']]);
    expect(pending()).toEqual([false]);
  });

  it('splits an open line where its words change speaker, before the line closes', async () => {
    const { store, publish, line } = await wired(['mic']);
    store.resetSession('mic');
    const emit = fakes.turn.get('mic')!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 5.3, id: 'mic#0', final: true });
    // "a" is the last speaker's; the rest is past every turn, so not confirmed.
    publish('mic', update('a b c d', 5));
    expect(line()).toEqual([['live-1', 'mic:0'], ['live-1~1', 'mic:0']]);
    expect(store.getState().segments.map((s) => !!s.unconfirmed)).toEqual([false, true]);
    // The next speaker's open turn arrives: the line splits between them.
    emit({ speaker: 'mic:1', source: 'mic', start: 5.45, end: 8, id: 'mic#1', final: false });
    expect(line()).toEqual([['live-1', 'mic:0'], ['live-1~1', 'mic:1']]);
    expect(store.getState().segments.map((s) => !!s.unconfirmed)).toEqual([false, false]);
    // The next partial of the open line keeps the split.
    publish('mic', update('a b c d e', 5));
    expect(line()).toEqual([['live-1', 'mic:0'], ['live-1~1', 'mic:1']]);
  });

  it('never flips an open line between the turn nearest it and the latest speaker', async () => {
    const { store, publish, line } = await wired(['mic']);
    const emit = fakes.turn.get('mic')!;
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4, id: 'mic#0', final: true });
    publish('mic', update('one two', 5));
    // A later turn by someone else: the line in the gap stays with the turn nearest it.
    emit({ speaker: 'mic:1', source: 'mic', start: 9, end: 12, id: 'mic#1', final: true });
    expect(line()).toEqual([['live-1', 'mic:0']]);
    const seen = new Set<string>();
    for (const text of ['one two three', 'one two three four']) {
      publish('mic', update(text, 5));
      seen.add(store.getState().segments[0].speaker);
    }
    expect([...seen]).toEqual(['mic:0']);
  });

  it('confirms a line said before the first turn with the nearest turn, once the diarizer is past it', async () => {
    const { store, publish, line } = await wired(['mic']);
    const emit = fakes.turn.get('mic')!;
    const pending = () => store.getState().segments.map((s) => !!s.unconfirmed);
    publish('mic', update('I do not know', 5, true));
    expect(pending()).toEqual([true]);
    // The first turn starts after the line: nothing will ever cover it.
    emit({ speaker: 'mic:1', source: 'mic', start: 7.4, end: 7.8, id: 'mic#0', final: true });
    expect(line()).toEqual([['live-1', 'mic:1']]);
    expect(pending()).toEqual([true]);
    // A later turn, whose own range starts past the line, confirms it.
    emit({ speaker: 'mic:2', source: 'mic', start: 9, end: 12, id: 'mic#1', final: true });
    expect(line()).toEqual([['live-1', 'mic:1']]);
    expect(pending()).toEqual([false]);
  });
});

describe('diarization bridge — overlap second pass', () => {
  it('hands each source its turns, and leaves the speaker of the words the pass added alone', async () => {
    const { bridge, store } = await consentedAndCached();
    const pass = await import('./overlap-retranscribe');
    const noted = vi.spyOn(pass, 'noteOverlapTurns');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    store.upsertSegment({
      id: `${pass.OVERLAP_SEGMENT_PREFIX}1`, source: 'mic', speaker: 'mic:1', text: 'right', start: 3.2, end: 3.5,
      final: true, words: [{ text: 'right', start: 3.2, end: 3.5 }],
    });
    emit({ speaker: 'mic:0', source: 'mic', start: 1, end: 4, id: 'mic#0', final: true });
    expect(noted.mock.calls.at(-1)).toEqual(['mic', [expect.objectContaining({ speaker: 'mic:0', start: 1, end: 4 })]]);
    expect(store.getState().segments.map((s) => s.speaker)).toEqual(['mic:1']);
    noted.mockRestore();
  });
});
