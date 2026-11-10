import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadFile,
  formatExport,
  groupTurns,
  resolveSpeakerLabel,
  splitTranscript,
  splitTurns,
  toMarkdown,
  toPlainText,
  toSrt,
  tidyText,
} from './export';
import type { Segment } from './types';

const seg = (over: Partial<Segment> = {}): Segment =>
  ({ id: 's1', speaker: 'mic:0', source: 'mic', start: 0, end: 1, text: 'hi', final: true, ...over }) as Segment;

describe('resolveSpeakerLabel', () => {
  it('labels an unmapped mic speaker "You" only when call audio is attached', () => {
    expect(resolveSpeakerLabel(seg(), {})).toBe('You');
    expect(resolveSpeakerLabel(seg(), {}, true)).toBe('Speaker');
  });

  it('threads callAudioMissing through formatExport', () => {
    expect(formatExport('txt', [seg()], {}, 't', { callAudioMissing: true })).toContain('\nSpeaker\n[00:00] hi\n');
    expect(formatExport('txt', [seg()], {}, 't')).toContain('\nYou\n[00:00] hi\n');
  });
});

describe('downloadFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('revokes the object URL after the click, not synchronously', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    const a = { click: vi.fn(), href: '', download: '' };
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: revoke });
    vi.stubGlobal('document', {
      createElement: () => a,
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    downloadFile('f.txt', 'x', 'text/plain');
    expect(a.click).toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});

describe('transcript format', () => {
  const speakers = {
    'mic:0': { id: 'mic:0', source: 'mic', label: 'Jens', colorIndex: 0 },
    'system:0': { id: 'system:0', source: 'system', label: 'Alex', colorIndex: 1 },
  } as never;
  const segs = [
    seg({ id: 'a', start: 0, end: 2, text: '  Hello   there ,' }),
    seg({ id: 'b', start: 2, end: 4, text: 'how are you ?' }),
    seg({ id: 'c', speaker: 'system:0', source: 'system', start: 65, end: 70, text: 'Fine.' }),
    seg({ id: 'd', start: 70, end: 71, text: 'partial', final: false }),
    seg({ id: 'e', start: 72, end: 73, text: '   ' }),
  ];
  const startedAt = new Date(2026, 8, 29, 14, 30, 0).getTime();

  it('tidies whitespace and punctuation', () => {
    expect(tidyText('  Hello   there ,  ok ?')).toBe('Hello there, ok?');
  });

  it('groups consecutive same-speaker segments into one turn, a line each, and drops partial/empty', () => {
    const turns = groupTurns(segs, speakers);
    expect(turns.map((t) => [t.label, t.lines.map((l) => l.text)])).toEqual([
      ['Jens', ['Hello there,', 'how are you?']],
      ['Alex', ['Fine.']],
    ]);
  });

  it('plain text: header, turns, no raw ids', () => {
    const out = toPlainText(segs, speakers, 'Standup', { startedAt });
    expect(out).toBe(
      [
        'Standup',
        '',
        'Date: Tuesday, 29 September 2026',
        'Time: 14:30–14:31',
        'Duration: 1m 10s',
        'Participants: Jens, Alex',
        '',
        'Jens',
        '[00:00] Hello there,',
        '[00:02] how are you?',
        '',
        'Alex',
        '[01:05] Fine.',
        '',
      ].join('\n'),
    );
    expect(out).not.toContain('mic:0');
  });

  it('markdown: same structure, omits date rows without startedAt', () => {
    const out = toMarkdown(segs, speakers, 'Standup');
    expect(out).toContain('# Standup');
    expect(out).toContain('**Participants:** Jens, Alex');
    expect(out).toContain('**Jens**\n\n[00:00] Hello there,  \n[00:02] how are you?\n\n**Alex**\n\n[01:05] Fine.\n');
    expect(out).not.toContain('Date:');
  });

  it('plain text shows hh:mm:ss past the first hour', () => {
    const out = toPlainText([seg({ start: 3725, end: 3727, text: 'Late.' })], speakers, 'Long');
    expect(out).toContain('Jens\n[01:02:05] Late.\n');
  });

  it('srt keeps per-segment speaker prefix', () => {
    expect(toSrt(segs, speakers)).toContain('Jens: how are you ?');
  });
});

describe('splitTurns', () => {
  const line = (id: string, speaker: string, start: number, end = start + 2) =>
    seg({ id, speaker, source: speaker.startsWith('mic') ? 'mic' : 'system', start, end });
  const ids = (turns: Segment[][]) => turns.map((t) => t.map((s) => s.id));

  it('orders by start time, whatever order segments arrived in', () => {
    expect(ids(splitTurns([line('b', 'mic:0', 5), line('a', 'mic:0', 1), line('c', 'mic:0', 9)]))).toEqual([
      ['a', 'b', 'c'],
    ]);
  });

  it('starts a turn on every speaker change, also back to an earlier speaker', () => {
    const turns = splitTurns([
      line('a', 'mic:0', 0),
      line('b', 'mic:1', 3),
      line('c', 'mic:0', 6),
      line('d', 'system:0', 9),
    ]);
    expect(ids(turns)).toEqual([['a'], ['b'], ['c'], ['d']]);
  });

  it('starts a turn after a pause over 30 s, even for the same speaker', () => {
    const turns = splitTurns([
      line('a', 'mic:0', 0, 4),
      line('b', 'mic:0', 34, 36), // 30 s after the end of a: same turn
      line('c', 'mic:0', 66.5, 68), // 30.5 s after b
    ]);
    expect(ids(turns)).toEqual([['a', 'b'], ['c']]);
  });

  it('moves a line into the right turn when its speaker is reassigned', () => {
    const before = [line('a', 'mic:0', 0), line('b', 'mic:0', 3), line('c', 'mic:0', 6)];
    expect(ids(splitTurns(before))).toEqual([['a', 'b', 'c']]);
    const after = [before[0], { ...before[1], speaker: 'mic:1' }, before[2]];
    expect(ids(splitTurns(after))).toEqual([['a'], ['b'], ['c']]);
  });
});

describe('overlapping speech', () => {
  const overlap = { start: 4, end: 6, speakers: ['mic:0', 'mic:1'] };
  const speakers = {
    'mic:0': { id: 'mic:0', source: 'mic' as const, label: 'Ann', colorIndex: 0 },
    'mic:1': { id: 'mic:1', source: 'mic' as const, label: 'Bo', colorIndex: 1 },
    'mic:2': { id: 'mic:2', source: 'mic' as const, label: 'Cy', colorIndex: 2 },
  };
  const transcript = [
    seg({ id: 'a', speaker: 'mic:0', start: 0, end: 4, text: 'so I think' }),
    seg({ id: 'b', speaker: 'mic:0', start: 4.1, end: 5, text: 'we should', overlap }),
    seg({ id: 'c', speaker: 'mic:1', start: 4.5, end: 5.8, text: 'no wait', overlap }),
    seg({ id: 'd', speaker: 'mic:1', start: 6, end: 8, text: 'hear me out' }),
  ];

  it('splitTranscript makes the overlap one block between turns, speakers with words first', () => {
    const blocks = splitTranscript(transcript);
    expect(blocks.map((b) => [b.kind, b.segments.map((s) => s.id)])).toEqual([
      ['turn', ['a']],
      ['overlap', ['b', 'c']],
      ['turn', ['d']],
    ]);
    expect(blocks[1]).toMatchObject({ start: 4, end: 6, speakers: ['mic:0', 'mic:1'] });

    // A speaker no words were caught of still gets a place, after the rest.
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

  it('makes an overlap whose words are all one speaker\'s ordinary lines, in the exports too', () => {
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
    // The live screenshot: "careful" / "I'm" against a lone "I".
    const words = (text: string, start: number, each: number) =>
      text.split(' ').map((w, i) => ({ text: w, start: start + i * each, end: start + (i + 1) * each }));
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
    // One word held for 0.8 s is a column of its own.
    const held = [noise[0], { ...noise[1], end: 5.3, words: words('I', 4.5, 0.8) }, noise[2]];
    expect(splitTranscript(held).map((b) => b.kind)).toEqual(['overlap']);
  });

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

    // A one-word back-channel from the call over the mic stays a line of its own.
    const backChannel = [transcript[1], line('s1', 'system', 'system:0', 10.6, 'yeah')];
    expect(splitTranscript(backChannel).map((b) => b.kind)).toEqual(['turn', 'turn']);
    // Lines of the two sources that do not overlap in time stay turns.
    expect(splitTranscript([transcript[0], transcript[3]]).map((b) => b.kind)).toEqual(['turn', 'turn']);
  });

  it('writes overlap as consecutive lines marked [overlap], each with its speaker', () => {
    const md = toMarkdown(transcript, speakers, 'T');
    expect(md).toContain(
      '**Ann**\n\n[00:00] so I think\n\n' +
        '[00:04] [overlap] **Ann:** we should  \n[00:04] [overlap] **Bo:** no wait\n\n' +
        '**Bo**\n\n[00:06] hear me out\n',
    );
    expect(md).toContain('**Participants:** Ann, Bo');

    const txt = toPlainText(transcript, speakers, 'T');
    expect(txt).toContain('Ann\n[00:00] so I think\n\n[00:04] [overlap] Ann: we should\n[00:04] [overlap] Bo: no wait\n\nBo\n');

    const srt = toSrt(transcript, speakers);
    expect(srt).toContain('[overlap] Bo: no wait');
    expect(srt).toContain('\nAnn: so I think');
  });

  it('exports a transcript saved before overlaps as before', () => {
    const legacy = transcript.map((s) => {
      const rest = { ...s };
      delete rest.overlap;
      return rest;
    });
    expect(toPlainText(legacy, speakers, 'T')).not.toContain('[overlap]');
    expect(groupTurns(legacy, speakers).map((t) => t.label)).toEqual(['Ann', 'Bo']);
  });
});
