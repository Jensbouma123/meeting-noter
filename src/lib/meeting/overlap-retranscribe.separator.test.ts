import { afterEach, describe, expect, it, vi } from 'vitest';
import { isOverlapPassSegment } from './overlap-pass-segments';
import { flushOverlapRetranscribe, noteOverlapTurns, setOverlapSeparator, setOverlapTranscriber } from './overlap-retranscribe';
import { separateOverlap } from './overlap-separate';
import { pushSeconds, resetOverlapState, turns } from './overlap-retranscribe.testSupport';
import * as storeStoreCore from './store-core';
import type { TranscribeClip } from './types/overlap-retranscribe';
import type { OverlapSeparator } from './types/overlap-separate';

vi.mock('./overlap-separate', () => ({ separateOverlap: vi.fn(), resetSeparation: vi.fn() }));

const separator: OverlapSeparator = { name: 'fake', backend: () => 'webgpu', separate: vi.fn() };

function passSegments() {
  return storeStoreCore.getState().segments.filter((s) => isOverlapPassSegment(s.id));
}

afterEach(() => {
  setOverlapSeparator(null);
  vi.mocked(separateOverlap).mockReset();
  resetOverlapState();
});

describe('the live second pass with a separator', () => {
  it('adds one segment per speaker from the separated words and skips the mixed-clip pass', async () => {
    vi.mocked(separateOverlap).mockResolvedValue([
      { text: 'alpha', start: 3.1, end: 3.3, speaker: 'mic:0' },
      { text: 'bravo', start: 3.2, end: 3.4, speaker: 'mic:1' },
      { text: 'charlie', start: 3.5, end: 3.7, speaker: 'mic:0' },
    ]);
    const transcribe = vi.fn<TranscribeClip>(async () => []);
    setOverlapTranscriber(transcribe);
    setOverlapSeparator(separator);
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();

    expect(vi.mocked(separateOverlap).mock.calls[0][6]).toBe(separator);
    expect(transcribe).not.toHaveBeenCalled();
    const added = passSegments();
    expect(added.map((s) => ({ speaker: s.speaker, text: s.text, start: s.start, end: s.end }))).toEqual([
      { speaker: 'mic:0', text: 'alpha charlie', start: 3.1, end: 3.7 },
      { speaker: 'mic:1', text: 'bravo', start: 3.2, end: 3.4 },
    ]);
    expect(added[0].overlap).toEqual({ start: 3, end: 4, speakers: ['mic:0', 'mic:1'] });
  });

  it('runs the mixed-clip pass when separation declines', async () => {
    vi.mocked(separateOverlap).mockResolvedValue(null);
    const transcribe = vi.fn<TranscribeClip>(async () => [{ text: 'right', start: 0.5, end: 0.8 }]);
    setOverlapTranscriber(transcribe);
    setOverlapSeparator(separator);
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();

    expect(separateOverlap).toHaveBeenCalledTimes(1);
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(passSegments().map((s) => s.text)).toEqual(['right']);
  });

  it('adds nothing and skips the mixed-clip pass when separation found no new words', async () => {
    vi.mocked(separateOverlap).mockResolvedValue([]);
    const transcribe = vi.fn<TranscribeClip>(async () => [{ text: 'right', start: 0.5, end: 0.8 }]);
    setOverlapTranscriber(transcribe);
    setOverlapSeparator(separator);
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();

    expect(transcribe).not.toHaveBeenCalled();
    expect(passSegments()).toEqual([]);
  });
});
