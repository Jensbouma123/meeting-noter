import { describe, expect, it, vi } from 'vitest';
import {
  flushOverlapRetranscribe,
  noteOverlapTurns,
  resetOverlapRetranscribe,
  setOverlapTranscriber,
} from './overlap-retranscribe';
import { pushSeconds, tick, turns } from './overlap-retranscribe.testSupport';
import * as storeStoreCore from './store-core';
import type { TranscribeClip } from './types/overlap-retranscribe';

describe('the live second pass', () => {
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
