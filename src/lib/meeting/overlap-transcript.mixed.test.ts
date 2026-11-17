import { describe, expect, it } from 'vitest';
import { toPlainText } from './export-writers';
import { splitTranscript } from './split-transcript';
import { seg } from './export.testUtils';
import { speakers } from './overlap-transcript.testSupport';

describe('overlapping speech across mic and call', () => {
  it('makes the mic and the call talking at once one overlap block, under the same column rule', () => {
    const words = (text: string, start: number, each = 0.3) =>
      text.split(' ').map((w, i) => ({ text: w, start: start + i * each, end: start + (i + 1) * each }));
    const line = (id: string, source: 'mic' | 'system', speaker: string, start: number, text: string) => {
      const ws = words(text, start);
      return seg({ id, source, speaker, start, end: ws[ws.length - 1].end, text, words: ws });
    };
    const both = {
      ...speakers,
      'system:0': { id: 'system:0', source: 'system' as const, label: 'Caller', colorIndex: 3 },
    };
    const transcript = [
      line('m1', 'mic', 'mic:0', 0, 'so I think'),
      line('m2', 'mic', 'mic:0', 10, 'we should really ship it'),
      line('s1', 'system', 'system:0', 10.6, 'no wait hear me out'),
      line('s2', 'system', 'system:0', 20, 'right then'),
    ];
    const blocks = splitTranscript(transcript);
    expect(blocks.map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['m1']],
      ['overlap', ['m2', 's1']],
      ['turn', ['s2']],
    ]);
    expect(blocks[1]).toMatchObject({ speakers: ['mic:0', 'system:0'] });
    expect(toPlainText(transcript, both, 'T')).toContain(
      '[00:10] [overlap] Ann: we should really ship it\n[00:10] [overlap] Caller: no wait hear me out',
    );
    const backChannel = [transcript[1], line('s1', 'system', 'system:0', 10.6, 'yeah')];
    expect(splitTranscript(backChannel).map((b) => b.kind)).toEqual(['turn', 'turn']);
    expect(splitTranscript([transcript[0], transcript[3]]).map((b) => b.kind)).toEqual(['turn', 'turn']);
  });
});
