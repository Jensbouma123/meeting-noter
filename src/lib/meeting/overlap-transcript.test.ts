import { describe, expect, it } from 'vitest';
import { groupTurns } from './group-turns';
import { toPlainText } from './export-writers';
import { splitTranscript } from './split-transcript';
import { seg } from './export.testUtils';
import { overlap, speakers, transcript, words } from './overlap-transcript.testSupport';

describe('overlapping speech', () => {
  it('splitTranscript makes the overlap one block between turns, speakers with words first', () => {
    const blocks = splitTranscript(transcript);
    expect(blocks.map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['a']],
      ['overlap', ['b', 'c']],
      ['turn', ['d']],
    ]);
    expect(blocks[1]).toMatchObject({ start: 4, end: 6, speakers: ['mic:0', 'mic:1'] });
    const quiet = { ...overlap, speakers: ['mic:2', 'mic:1', 'mic:0'] };
    const [block] = splitTranscript([
      seg({ id: 'x', speaker: 'mic:1', start: 4, end: 5, overlap: quiet }),
      seg({ id: 'y', speaker: 'mic:0', start: 5, end: 6, overlap: quiet }),
    ]);
    expect(block).toMatchObject({ kind: 'overlap', speakers: ['mic:1', 'mic:0', 'mic:2'] });
  });

  it('splits two overlaps apart, and a turn never continues across one', () => {
    const later = { start: 20, end: 21, speakers: ['mic:0', 'mic:1'] };
    const blocks = splitTranscript([
      seg({ id: 'a', speaker: 'mic:0', start: 0, end: 4 }),
      seg({ id: 'b', speaker: 'mic:0', start: 4, end: 5, overlap }),
      seg({ id: 'b2', speaker: 'mic:1', start: 5, end: 6, overlap }),
      seg({ id: 'c', speaker: 'mic:1', start: 7, end: 9 }),
      seg({ id: 'd', speaker: 'mic:0', start: 20, end: 20.5, text: 'hi there', overlap: later }),
      seg({ id: 'd2', speaker: 'mic:1', start: 20.5, end: 21, text: 'hi you', overlap: later }),
    ]);
    expect(blocks.map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['a']],
      ['overlap', ['b', 'b2']],
      ['turn', ['c']],
      ['overlap', ['d', 'd2']],
    ]);
  });

  it("makes an overlap whose words are all one speaker's ordinary lines, in the exports too", () => {
    const oneVoice = [
      seg({ id: 'a', speaker: 'mic:0', start: 0, end: 4, text: 'so I think' }),
      seg({ id: 'b', speaker: 'mic:0', start: 4.1, end: 5, text: 'we should', overlap }),
      seg({ id: 'c', speaker: 'mic:1', start: 6, end: 8, text: 'hear me out' }),
    ];
    expect(splitTranscript(oneVoice).map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['a', 'b']],
      ['turn', ['c']],
    ]);
    expect(splitTranscript(oneVoice)[0].segments[1].overlap).toBeUndefined();
    expect(toPlainText(oneVoice, speakers, 'T')).not.toContain('[overlap]');
    expect(groupTurns(oneVoice, speakers).map((t) => t.label)).toEqual(['Ann', 'Bo']);
  });

  it('makes an overlap ordinary lines when one column is a back-channel: under 2 words and 0.8 s', () => {
    const noise = [
      seg({ id: 'a', speaker: 'mic:0', start: 4.1, end: 4.5, text: 'careful', overlap, words: words('careful', 4.1, 0.4) }),
      seg({ id: 'b', speaker: 'mic:1', start: 4.5, end: 4.7, text: 'I', overlap, words: words('I', 4.5, 0.2) }),
      seg({ id: 'c', speaker: 'mic:0', start: 4.8, end: 5, text: "I'm", overlap, words: words("I'm", 4.8, 0.2) }),
    ];
    expect(splitTranscript(noise).map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['a']],
      ['turn', ['b']],
      ['turn', ['c']],
    ]);
    expect(splitTranscript(noise).every((b) => b.segments.every((s) => !s.overlap))).toBe(true);
    const held = [noise[0], { ...noise[1], end: 5.3, words: words('I', 4.5, 0.8) }, noise[2]];
    expect(splitTranscript(held).map((b) => b.kind)).toEqual(['overlap']);
  });

  it('makes the mic and the call talking at once one overlap block, under the same column rule', () => {
    const line = (id: string, source: 'mic' | 'system', speaker: string, start: number, text: string) => {
      const ws = words(text, start);
      return seg({ id, source, speaker, start, end: ws[ws.length - 1].end, text, words: ws });
    };
    const both = {
      ...speakers,
      'system:0': { id: 'system:0', source: 'system' as const, label: 'Caller', colorIndex: 3 },
    };
    const crossSource = [
      line('m1', 'mic', 'mic:0', 0, 'so I think'),
      line('m2', 'mic', 'mic:0', 10, 'we should really ship it'),
      line('s1', 'system', 'system:0', 10.6, 'no wait hear me out'),
      line('s2', 'system', 'system:0', 20, 'right then'),
    ];
    const blocks = splitTranscript(crossSource);
    expect(blocks.map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['m1']],
      ['overlap', ['m2', 's1']],
      ['turn', ['s2']],
    ]);
    expect(blocks[1]).toMatchObject({ speakers: ['mic:0', 'system:0'] });
    expect(toPlainText(crossSource, both, 'T')).toContain(
      '[00:10] [overlap] Ann: we should really ship it\n[00:10] [overlap] Caller: no wait hear me out',
    );
    const backChannel = [crossSource[1], line('s1', 'system', 'system:0', 10.6, 'yeah')];
    expect(splitTranscript(backChannel).map((b) => b.kind)).toEqual(['turn', 'turn']);
    expect(splitTranscript([crossSource[0], crossSource[3]]).map((b) => b.kind)).toEqual(['turn', 'turn']);
  });
});
