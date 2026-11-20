import { afterEach, describe, expect, it, vi } from 'vitest';
import { isOverlapPassSegment } from './overlap-pass-segments';
import { flushOverlapRetranscribe, noteOverlapTurns, setOverlapSeparator, setOverlapTranscriber } from './overlap-retranscribe';
import { separateOverlap } from './overlap-separate';
import { pushSeconds, resetOverlapState, turns } from './overlap-retranscribe.testSupport';
import { upsertSegment } from './segment-store';
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
    vi.mocked(separateOverlap).mockResolvedValue({
      words: [
        { text: 'alpha', start: 3.1, end: 3.3, speaker: 'mic:0' },
        { text: 'bravo', start: 3.2, end: 3.4, speaker: 'mic:1' },
        { text: 'charlie', start: 3.5, end: 3.7, speaker: 'mic:0' },
      ],
      moved: [],
    });
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

  it('moves re-attributed words out of the merged first-pass line into the other speaker line', async () => {
    upsertSegment({
      id: 'live-1',
      source: 'mic',
      speaker: 'mic:0',
      text: 'so then yes',
      start: 2.8,
      end: 3.6,
      final: true,
      words: [
        { text: 'so', start: 2.8, end: 3.0 },
        { text: 'then', start: 3.1, end: 3.3 },
        { text: 'yes', start: 3.4, end: 3.6 },
      ],
    });
    const yes = { text: 'yes', start: 3.4, end: 3.6, speaker: 'mic:0' };
    vi.mocked(separateOverlap).mockResolvedValue({ words: [{ ...yes, speaker: 'mic:1' }], moved: [yes] });
    const transcribe = vi.fn<TranscribeClip>(async () => []);
    setOverlapTranscriber(transcribe);
    setOverlapSeparator(separator);
    pushSeconds(0, 6);
    noteOverlapTurns('mic', turns);
    await flushOverlapRetranscribe();

    const lines = storeStoreCore.getState().segments.map((s) => ({ speaker: s.speaker, text: s.text, start: s.start, end: s.end }));
    expect(lines).toEqual([
      { speaker: 'mic:0', text: 'so then', start: 2.8, end: 3.3 },
      { speaker: 'mic:1', text: 'yes', start: 3.4, end: 3.6 },
    ]);
    expect(transcribe).not.toHaveBeenCalled();
  });
});
