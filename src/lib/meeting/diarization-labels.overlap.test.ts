import { describe, expect, it, vi } from 'vitest';
import { consentedAndCached, fakes } from './diarization-bridge-fakes';
import './diarization-labels.testSupport';
import { OVERLAP_SEGMENT_PREFIX } from './overlap-pass-segments';

describe('diarization bridge — overlap second pass', () => {
  it('hands each source its turns, and leaves the speaker of the words the pass added alone', async () => {
    const { bridge, store } = await consentedAndCached();
    const pass = await import('./overlap-retranscribe');
    const noted = vi.spyOn(pass, 'noteOverlapTurns');
    bridge.startDiarization(['mic']);
    const emit = fakes.turn.get('mic')!;
    store.upsertSegment({
      id: `${OVERLAP_SEGMENT_PREFIX}1`,
      source: 'mic',
      speaker: 'mic:1',
      text: 'right',
      start: 3.2,
      end: 3.5,
      final: true,
      words: [{ text: 'right', start: 3.2, end: 3.5 }],
    });
    emit({ speaker: 'mic:0', source: 'mic', start: 1, end: 4, id: 'mic#0', final: true });
    expect(noted.mock.calls.at(-1)).toEqual(['mic', [expect.objectContaining({ speaker: 'mic:0', start: 1, end: 4 })]]);
    expect(store.getState().segments.map((s) => s.speaker)).toEqual(['mic:1']);
    noted.mockRestore();
  });
});
