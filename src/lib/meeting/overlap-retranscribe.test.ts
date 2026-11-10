import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RETRANSCRIBE_PAD_SECONDS,
  SETTLE_SECONDS,
  flushOverlapRetranscribe,
  isOverlapPassSegment,
  missedWords,
  noteOverlapTurns,
  overlapSpans,
  pushOverlapAudio,
  quieterSpeaker,
  resetOverlapRetranscribe,
  retranscribeOverlap,
  setOverlapTranscriber,
  type AttributedWord,
  type OverlapTurn,
  type TranscribeClip,
} from './overlap-retranscribe';
import * as store from './store';

const SR = 16_000;

function word(text: string, start: number, end = start + 0.3, speaker = 'mic:0'): AttributedWord {
  return { text, start, end, speaker };
}

/** `seconds` of capture frames (100 ms each) for `source`, from `from`. */
function pushSeconds(from: number, seconds: number): void {
  for (let t = from; t < from + seconds - 1e-9; t += 0.1) {
    pushOverlapAudio('mic', new Int16Array(1600).fill(1000).buffer, Math.round(t * SR));
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  setOverlapTranscriber(null);
  resetOverlapRetranscribe();
  store.resetSession('mic');
});

describe('overlapSpans', () => {
  it('finds each stretch of two or more speakers at least the minimum long, and who talks in it', () => {
    const turns: OverlapTurn[] = [
      { speaker: 'a', start: 0, end: 5 },
      { speaker: 'b', start: 4, end: 8 },
      { speaker: 'a', start: 7.7, end: 10 },
    ];
    expect(overlapSpans(turns)).toEqual([{ start: 4, end: 5, speakers: ['a', 'b'] }]);
    expect(overlapSpans(turns, 0.2)).toHaveLength(2);
  });

  it('does not count a turn that ends where the next begins', () => {
    expect(overlapSpans([{ speaker: 'a', start: 0, end: 2 }, { speaker: 'b', start: 2, end: 4 }], 0)).toEqual([]);
  });
});

describe('missedWords', () => {
  const span = { start: 10, end: 12, speakers: ['a', 'b'] };

  it('keeps the second pass words inside the span that the first pass does not have', () => {
    const first = [word('so', 10.1), word('we', 10.5)];
    const second = [word('So', 10.2), word('yeah', 10.4), word('we', 10.6), word('agree', 12.5)];
    expect(missedWords(first, second, span).map((w) => w.text)).toEqual(['yeah']);
  });

  it('lets one first-pass word vouch for one second-pass word only', () => {
    const second = [word('yeah', 10.2), word('yeah', 10.6)];
    expect(missedWords([word('yeah', 10.3)], second, span).map((w) => w.start)).toEqual([10.6]);
  });

  it('adds the same word when the first pass has it too far away', () => {
    expect(missedWords([word('no', 10)], [word('no', 11.5)], span)).toHaveLength(1);
  });

  it('adds nothing of a phrase the first pass has, placed over a second off', () => {
    // The live screenshot: the pass heard the louder voice again, its clip
    // times 0.9 s off the live windows', and the phrase showed twice.
    const text = ['I', 'I', 'literally', 'this', 'might', 'no'];
    const first = text.map((t, i) => word(t, 10 + i * 0.25));
    const second = [word('So', 10.6), ...text.map((t, i) => word(t, 10.9 + i * 0.15))];
    expect(missedWords(first, second, span).map((w) => w.text)).toEqual(['So']);
  });
});

describe('quieterSpeaker', () => {
  const span = { start: 10, end: 12, speakers: ['a', 'b'] };
  const turns: OverlapTurn[] = [
    { speaker: 'a', start: 5, end: 12 },
    { speaker: 'b', start: 10, end: 15 },
  ];

  it('is the overlap speaker fewest first-pass words are attributed to', () => {
    expect(quieterSpeaker(span, [word('x', 10.2, 10.4, 'b'), word('y', 10.8, 11, 'b')], turns)).toBe('a');
    expect(quieterSpeaker(span, [word('x', 10.2, 10.4, 'a')], turns)).toBe('b');
  });

  it('with no words to go by, is the speaker with the most turn time in the span', () => {
    expect(quieterSpeaker({ ...span, end: 11 }, [], [...turns, { speaker: 'b', start: 9, end: 11 }])).toBe('b');
  });
});

describe('retranscribeOverlap', () => {
  it('transcribes the padded span and places the words it adds on the source clock, under the quieter speaker', async () => {
    const span = { start: 10, end: 12, speakers: ['a', 'b'] };
    const turns: OverlapTurn[] = [
      { speaker: 'a', start: 5, end: 12 },
      { speaker: 'b', start: 10, end: 15 },
    ];
    const asked: [number, number][] = [];
    const audioAt = (start: number, end: number) => {
      asked.push([start, end]);
      return { audio: new Float32Array(Math.round((end - start) * SR)), start };
    };
    const transcribe: TranscribeClip = async () => [
      { text: 'we', start: 0.4, end: 0.6 },
      { text: 'yes', start: 1.0, end: 1.2 },
    ];
    const added = await retranscribeOverlap(span, [word('we', 10.1, 10.3, 'a')], turns, audioAt, transcribe);
    expect(asked).toEqual([[10 - RETRANSCRIBE_PAD_SECONDS, 12 + RETRANSCRIBE_PAD_SECONDS]]);
    expect(added.map((w) => [w.text, w.speaker])).toEqual([['yes', 'b']]);
    expect(added[0].start).toBeCloseTo(10.7);
    expect(added[0].end).toBeCloseTo(10.9);
  });
});

describe('the live second pass', () => {
  const turns = [
    { speaker: 'mic:0', start: 1, end: 4 },
    { speaker: 'mic:1', start: 3, end: 6 },
  ];

  it('transcribes a settled overlap once and adds its missed words as a segment of the quieter speaker', async () => {
    const transcribe = vi.fn<TranscribeClip>(async (audio) => {
      expect(audio.length).toBe(Math.round((1 + 2 * RETRANSCRIBE_PAD_SECONDS) * SR));
      return [{ text: 'right', start: 0.5, end: 0.8 }];
    });
    setOverlapTranscriber(transcribe);
    store.upsertSegment({
      id: 'live-1', source: 'mic', speaker: 'mic:0', text: 'so then', start: 1, end: 4, final: true,
      words: [{ text: 'so', start: 1, end: 1.3 }, { text: 'then', start: 3.3, end: 3.6 }],
    });
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await tick();
    expect(transcribe).not.toHaveBeenCalled();

    pushSeconds(6, SETTLE_SECONDS);
    noteOverlapTurns('mic', turns);
    await tick();
    expect(transcribe).toHaveBeenCalledTimes(1);
    const added = store.getState().segments.filter((s) => isOverlapPassSegment(s.id));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      source: 'mic',
      speaker: 'mic:1',
      text: 'right',
      final: true,
      overlap: { start: 3, end: 4, speakers: ['mic:0', 'mic:1'] },
    });
    expect(added[0].start).toBeCloseTo(3.2);
    expect(added[0].end).toBeCloseTo(3.5);
  });

  it('drops the words the first pass writes down after the pass added them', async () => {
    setOverlapTranscriber(async () => [
      { text: 'we', start: 0.4, end: 0.6 },
      { text: 'should', start: 0.6, end: 0.8 },
      { text: 'go', start: 0.9, end: 1.1 },
    ]);
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();
    const pass = () => store.getState().segments.filter((s) => isOverlapPassSegment(s.id)).map((s) => s.text);
    expect(pass()).toEqual(['we should go']);

    // The live chunker catches up on the overlap: the same words, a second later.
    store.upsertSegment({
      id: 'live-1', source: 'mic', speaker: 'mic:0', text: 'we should', start: 3.1, end: 3.8, final: true,
      words: [{ text: 'we', start: 3.1, end: 3.3 }, { text: 'should', start: 3.4, end: 3.6 }],
    });
    pushSeconds(6, 1);
    expect(pass()).toEqual(['go']);
    store.upsertSegment({
      id: 'live-1', source: 'mic', speaker: 'mic:0', text: 'we should go', start: 3.1, end: 4, final: true,
      words: [{ text: 'we', start: 3.1, end: 3.3 }, { text: 'should', start: 3.4, end: 3.6 }, { text: 'go', start: 3.6, end: 3.9 }],
    });
    pushSeconds(7, 1);
    expect(pass()).toEqual([]);
  });

  it('ignores open turns, and on Stop transcribes what has not settled yet', async () => {
    const transcribe = vi.fn<TranscribeClip>(async () => []);
    setOverlapTranscriber(transcribe);
    pushSeconds(0, 6);
    noteOverlapTurns('mic', [turns[0], { ...turns[1], final: false }]);
    await flushOverlapRetranscribe();
    expect(transcribe).not.toHaveBeenCalled();

    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();
    expect(transcribe).toHaveBeenCalledTimes(1);
  });

  it('holds no audio and transcribes nothing without a transcriber', async () => {
    pushSeconds(0, 6);
    const transcribe = vi.fn<TranscribeClip>(async () => []);
    setOverlapTranscriber(transcribe);
    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();
    // The clip asked for is empty, so the model is never run.
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('drops the words of a pass still running when the session is reset', async () => {
    let answer!: (words: { text: string; start: number; end: number }[]) => void;
    setOverlapTranscriber(() => new Promise((resolve) => (answer = resolve)));
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    const flushed = flushOverlapRetranscribe();
    await tick();
    resetOverlapRetranscribe();
    answer([{ text: 'late', start: 0.5, end: 0.7 }]);
    await flushed;
    expect(store.getState().segments).toEqual([]);
  });

  it('gives up waiting on Stop after the timeout', async () => {
    setOverlapTranscriber(() => new Promise(() => {}));
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await expect(flushOverlapRetranscribe(10)).resolves.toBeUndefined();
  });
});

describe('isOverlapPassSegment', () => {
  it('knows the pass segments, also under an appended recording prefix', () => {
    expect(isOverlapPassSegment('ovl-3')).toBe(true);
    expect(isOverlapPassSegment('a2:ovl-3')).toBe(true);
    expect(isOverlapPassSegment('live-3')).toBe(false);
  });
});
