import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The language-ID and diarization bridges receive the capture worklet's
 * frames, which are Int16 PCM. Both used to wrap that buffer in a
 * `Float32Array`, which reinterprets pairs of Int16 samples as float32 bit
 * patterns: half the samples, and values of 1e-41 to 1e38 and NaN. The models
 * never saw audio, so no language was detected and no speaker turn was found.
 */

const fakes = vi.hoisted(() => ({
  diarizerPushes: [] as { source: string; chunk: Float32Array; startSample?: number }[],
  turnListeners: new Map<string, (turn: { speaker: string; source: string; start: number; end: number }) => void>(),
  langidPushes: [] as Float32Array[],
  errorListeners: new Map<string, (message: string) => void>(),
  disposed: [] as string[],
}));

vi.mock('@/lib/asr/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/asr/browser')>()),
  getModelStatus: () => ({ status: 'cached' }),
  isConsentGiven: () => true,
}));

vi.mock('@/lib/diarization/browser', () => ({
  createDiarizer: ({ source }: { source: string }) => ({
    push(chunk: Float32Array, startSample?: number) {
      fakes.diarizerPushes.push({ source, chunk, startSample });
    },
    onSpeakerTurn(cb: (turn: { speaker: string; source: string; start: number; end: number }) => void) {
      fakes.turnListeners.set(source, cb);
      return () => fakes.turnListeners.delete(source);
    },
    onError(cb: (message: string) => void) {
      fakes.errorListeners.set(source, cb);
      return () => fakes.errorListeners.delete(source);
    },
    onReady: () => () => {},
    flush: async () => {},
    dispose() {
      fakes.disposed.push(source);
    },
  }),
}));

vi.mock('@/lib/langid', () => ({
  createLanguageDetector: () => ({
    push(samples: Float32Array) {
      fakes.langidPushes.push(samples);
    },
    onLanguage: () => () => {},
    onError: () => () => {},
    dispose() {},
  }),
}));

/** One 100 ms worklet frame: full-scale extremes, zero, and half scale. */
function frame(): ArrayBuffer {
  const samples = new Int16Array(1600);
  samples[0] = -32768;
  samples[1] = 32767;
  samples[2] = 0;
  samples[3] = 16384;
  samples[4] = -16384;
  for (let i = 5; i < samples.length; i += 1) samples[i] = Math.round(Math.sin(i / 10) * 20000);
  return samples.buffer;
}

function expectConverted(pushed: Float32Array, pcm: ArrayBuffer): void {
  const int16 = new Int16Array(pcm);
  expect(pushed).toHaveLength(int16.length);
  for (let i = 0; i < int16.length; i += 1) {
    expect(pushed[i]).toBeGreaterThanOrEqual(-1);
    expect(pushed[i]).toBeLessThan(1);
    expect(pushed[i]).toBe(int16[i] / 32768);
  }
  expect(pushed[0]).toBe(-1);
  expect(pushed[1]).toBeCloseTo(0.99997, 5);
  expect(pushed[3]).toBe(0.5);
  expect(pushed[4]).toBe(-0.5);
}

beforeEach(() => {
  fakes.diarizerPushes.length = 0;
  fakes.turnListeners.clear();
  fakes.langidPushes.length = 0;
  fakes.errorListeners.clear();
  fakes.disposed.length = 0;
});

afterEach(async () => {
  const { resetDiarization } = await import('./diarization-bridge');
  const { stopLangId } = await import('./langid-bridge');
  resetDiarization();
  stopLangId();
});

describe('diarization bridge', () => {
  it('feeds the diarizer Float32 audio in [-1, 1], one sample per Int16 sample', async () => {
    const { startDiarization, pushDiarizationAudio } = await import('./diarization-bridge');
    startDiarization(['mic']);
    const pcm = frame();

    pushDiarizationAudio('mic', pcm, 4800);

    expect(fakes.diarizerPushes).toHaveLength(1);
    expectConverted(fakes.diarizerPushes[0].chunk, pcm);
    // The frame's place on the capture clock goes with it.
    expect(fakes.diarizerPushes[0].startSample).toBe(4800);
    // A copy: ASR still reads the same frame after this.
    expect(pcm.byteLength).toBe(3200);
  });

  it('relabels a segment once a turn covering it closes', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('system');
    startDiarization(['system']);
    store.upsertSegment({ id: 'a', source: 'system', speaker: 'system:0', text: 'hi', start: 10, end: 12, final: true });
    store.upsertSegment({ id: 'b', source: 'system', speaker: 'system:0', text: 'yo', start: 12, end: 16, final: true });

    const emit = fakes.turnListeners.get('system')!;
    emit({ speaker: 'system:0', source: 'system', start: 9.8, end: 12.1 });
    emit({ speaker: 'system:1', source: 'system', start: 12.4, end: 15.9 });

    const bySpeaker = Object.fromEntries(store.getState().segments.map((s) => [s.id, s.speaker]));
    expect(bySpeaker).toEqual({ a: 'system:0', b: 'system:1' });
    expect(store.getState().speakers['system:1'].label).toBe('Speaker 2');
  });
});

describe('diarization bridge — word-level attribution', () => {
  /** A final line of words one second each, from `at`. */
  function wordsLine(id: string, words: string[], at: number) {
    return {
      id,
      source: 'mic' as const,
      speaker: 'mic:0',
      text: words.join(' '),
      start: at,
      end: at + words.length - 0.2,
      final: true,
      words: words.map((text, i) => ({ text, start: at + i, end: at + i + 0.8 })),
    };
  }

  it('splits a line already final when a late turn shows the speaker changed inside it', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    emit({ speaker: 'mic:0', source: 'mic', start: 9.5, end: 12.9 });
    store.upsertSegment(wordsLine('s1', ['so', 'we', 'agree', 'yes', 'we', 'do'], 10));

    emit({ speaker: 'mic:1', source: 'mic', start: 13, end: 16 });

    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.text])).toEqual([
      ['s1', 'mic:0', 'so we agree'],
      ['s1~3', 'mic:1', 'yes we do'],
    ]);
  });

  it('moves the boundary of a split line when a later turn corrects it', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    store.upsertSegment(wordsLine('s1', ['a', 'b', 'c', 'd'], 0));
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 1.5 });
    emit({ speaker: 'mic:1', source: 'mic', start: 2, end: 4 });
    expect(store.getState().segments.map((s) => s.text)).toEqual(['a b', 'c d']);

    // Most of word "b" (1–1.8 s) turns out to be the second speaker's (the
    // turns overlap for under MIN_OVERLAP_SECONDS, so not as an overlap).
    emit({ speaker: 'mic:1', source: 'mic', start: 1.2, end: 2 });

    expect(store.getState().segments.map((s) => [s.id, s.speaker, s.text])).toEqual([
      ['s1', 'mic:0', 'a'],
      ['s1~1', 'mic:1', 'b c d'],
    ]);
  });

  it('marks the words where two speakers talk at once, each word in its own speaker\'s part', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    store.upsertSegment(wordsLine('s1', ['a', 'b', 'c', 'd', 'e', 'f'], 0));
    // mic:0 hands over to mic:1, both talking 2–4 s.
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 4 });
    emit({ speaker: 'mic:1', source: 'mic', start: 2, end: 6 });

    const segments = store.getState().segments;
    expect(segments.map((s) => [s.speaker, s.text, s.overlap ?? null])).toEqual([
      ['mic:0', 'a b', null],
      // Both turns cover "c" and "d": the first half stays the outgoing speaker's.
      ['mic:0', 'c', { start: 2, end: 4, speakers: ['mic:0', 'mic:1'] }],
      ['mic:1', 'd', { start: 2, end: 4, speakers: ['mic:0', 'mic:1'] }],
      ['mic:1', 'e f', null],
    ]);
  });

  it('does not count turns touching for under MIN_OVERLAP_SECONDS as overlap', async () => {
    const { startDiarization, MIN_OVERLAP_SECONDS } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    startDiarization(['mic']);
    const emit = fakes.turnListeners.get('mic')!;
    store.upsertSegment(wordsLine('s1', ['a', 'b', 'c', 'd'], 0));
    emit({ speaker: 'mic:0', source: 'mic', start: 0, end: 2 });
    emit({ speaker: 'mic:1', source: 'mic', start: 2 - MIN_OVERLAP_SECONDS / 2, end: 4 });

    expect(store.getState().segments.some((s) => s.overlap)).toBe(false);
  });

  it('relabels lines from before the first turn once it arrives', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    startDiarization(['mic']);
    // Transcribed while the diarizer was still loading: no turn covers it.
    store.upsertSegment(wordsLine('early', ['hello', 'there'], 1));

    fakes.turnListeners.get('mic')!({ speaker: 'mic:2', source: 'mic', start: 5, end: 8 });

    expect(store.getState().segments.map((s) => [s.id, s.speaker])).toEqual([['early', 'mic:2']]);
  });
});

describe('diarization bridge — failures and lookup', () => {
  it('disposes a diarizer whose worker errors and raises a warning (F1)', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    startDiarization(['mic']);

    fakes.errorListeners.get('mic')!('model load failed');

    expect(fakes.disposed).toEqual(['mic']);
    expect(store.getState().warning).toContain('model load failed');
  });

  it('relabels an appended recording on its own capture clock, leaving the earlier transcript alone', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('mic');
    store.upsertSegment({ id: 'old', source: 'mic', speaker: 'mic:0', text: 'before', start: 0, end: 60, final: true });
    store.armAppend();
    store.resetSession('mic');
    startDiarization(['mic']);
    // Capture clock 2–4 s of the new recording, stored at 62–64 s.
    store.upsertSegment({ id: '1', source: 'mic', speaker: 'mic:0', text: 'after', start: 2, end: 4, final: true });

    fakes.turnListeners.get('mic')!({ speaker: 'mic:1', source: 'mic', start: 1.9, end: 4.1 });

    const segs = store.getState().segments;
    expect(segs.map((s) => [s.text, s.speaker, s.start])).toEqual([
      ['before', 'mic:0', 0],
      ['after', 'mic:1', 62],
    ]);
    store.cancelAppend();
  });

  it('keeps a long early turn overlapping a late segment among many turns (F2)', async () => {
    const { startDiarization } = await import('./diarization-bridge');
    const store = await import('./store');
    store.resetSession('system');
    startDiarization(['system']);
    const emit = fakes.turnListeners.get('system')!;
    emit({ speaker: 'system:2', source: 'system', start: 0, end: 500 });
    for (let i = 0; i < 300; i += 1) {
      emit({ speaker: 'system:0', source: 'system', start: 10 + i, end: 10.2 + i });
    }
    store.upsertSegment({ id: 'z', source: 'system', speaker: 'system:1', text: 'x', start: 400, end: 401, final: true });
    emit({ speaker: 'system:2', source: 'system', start: 399, end: 402 });

    expect(store.getState().segments.find((s) => s.id === 'z')!.speaker).toBe('system:2');
  });
});

describe('language-ID bridge', () => {
  it('feeds the detector Float32 audio in [-1, 1], one sample per Int16 sample', async () => {
    const { startLangId, pushLangIdAudio, resetLanguageOverride } = await import('./langid-bridge');
    resetLanguageOverride();
    startLangId(['mic']);
    const pcm = frame();

    pushLangIdAudio('mic', pcm);

    expect(fakes.langidPushes).toHaveLength(1);
    expectConverted(fakes.langidPushes[0], pcm);
  });
});
