import { describe, expect, it } from 'vitest';
import { formatExport } from './export-formats';
import { groupTurns } from './group-turns';
import { toMarkdown, toPlainText, toSrt } from './export-writers';
import { resolveSpeakerLabel, tidyText } from './transcript-format';
import { seg } from './export.testUtils';

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
