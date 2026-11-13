import { afterEach, describe, expect, it, vi } from 'vitest';
import { RETRANSCRIBE_PAD_SECONDS } from './overlap-clip-pass';
import { isOverlapPassSegment } from './overlap-pass-segments';
import {
  SETTLE_SECONDS,
  flushOverlapRetranscribe,
  noteOverlapTurns,
  pushOverlapAudio,
  resetOverlapRetranscribe,
  setOverlapTranscriber,
} from './overlap-retranscribe';
import * as storeSessionReset from './session-reset';
import * as storeSegmentStore from './segment-store';
import * as storeStoreCore from './store-core';
import type { TranscribeClip } from './types/overlap-retranscribe';

const SR = 16_000;

function pushSeconds(from: number, seconds: number): void {
  for (let t = from; t < from + seconds - 1e-9; t += 0.1) {
    pushOverlapAudio('mic', new Int16Array(1600).fill(1000).buffer, Math.round(t * SR));
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  setOverlapTranscriber(null);
  resetOverlapRetranscribe();
  storeSessionReset.resetSession('mic');
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
    storeSegmentStore.upsertSegment({
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
    const added = storeStoreCore.getState().segments.filter((s) => isOverlapPassSegment(s.id));
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
    const pass = () => storeStoreCore.getState().segments.filter((s) => isOverlapPassSegment(s.id)).map((s) => s.text);
    expect(pass()).toEqual(['we should go']);

    storeSegmentStore.upsertSegment({
      id: 'live-1', source: 'mic', speaker: 'mic:0', text: 'we should', start: 3.1, end: 3.8, final: true,
      words: [{ text: 'we', start: 3.1, end: 3.3 }, { text: 'should', start: 3.4, end: 3.6 }],
    });
    pushSeconds(6, 1);
    expect(pass()).toEqual(['go']);
    storeSegmentStore.upsertSegment({
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
    expect(storeStoreCore.getState().segments).toEqual([]);
  });

  it('gives up waiting on Stop after the timeout', async () => {
    setOverlapTranscriber(() => new Promise(() => {}));
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await expect(flushOverlapRetranscribe(10)).resolves.toBeUndefined();
  });
});
