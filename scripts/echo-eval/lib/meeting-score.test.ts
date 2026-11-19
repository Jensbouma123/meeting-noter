import { describe, expect, it } from 'vitest';
import type { MeetingCase, MeetingTurn } from '../types/meeting-case';
import type { MeetingSegment } from '../types/meeting-result';
import { scoreMeeting } from './meeting-score';

const turn = (speaker: string, role: 'local' | 'remote', s: number, e: number, extra: Partial<MeetingTurn> = {}): MeetingTurn => ({
  utt: 'x', speaker, role, lang: 'nl', event: 'turn', startSec: s, endSec: e, clipSec: null, pairId: null, pairing: null, overlapFrac: null, ...extra,
});
const seg = (source: 'mic' | 'system', text: string, start: number, end: number, kept = true): MeetingSegment => ({ source, text, start, end, kept });
const meeting = (turns: MeetingTurn[]): MeetingCase => ({
  id: 'm', split: 'dev', lang: 'nl', bleed: null, turns, durationSec: 30,
  speakers: [{ id: 'L', role: 'local', lang: 'nl' }, { id: 'R', role: 'remote', lang: 'nl' }],
});
const score = (turns: MeetingTurn[], segments: MeetingSegment[]) => scoreMeeting(meeting(turns), { id: 'm', split: 'dev', segments });

describe('scoreMeeting', () => {
  it('counts a surviving mic twin as a duplicate line and a phantom speaker', () => {
    const s = score(
      [turn('R', 'remote', 0, 5), turn('L', 'local', 8, 12)],
      [seg('system', 'dit is een test zin', 0, 5), seg('mic', 'dit is een test zin', 0.3, 5.2), seg('mic', 'ja precies dat klopt', 8, 12)],
    );
    expect(s.turns[0].dups).toBe(1);
    expect(s.phantomSpeakers).toBe(1);
    expect(s.truthSpeakers).toBe(2);
    expect(s.shownSpeakers).toBe(3);
  });

  it('counts a heard but dropped local line as lost and unheard as neither', () => {
    const s = score(
      [turn('L', 'local', 0, 4), turn('R', 'remote', 6, 10)],
      [seg('mic', 'een echte lokale zin', 0, 4, false)],
    );
    expect(s.turns[0]).toMatchObject({ heard: true, kept: false, lost: true });
    expect(s.turns[1]).toMatchObject({ heard: false, lost: false });
    expect(s.lostSpeakers).toBe(2);
  });

  it('scores a crosstalk pair as both kept, merged or echo-marked', () => {
    const tag = { pairId: 0, pairing: 'remote+remote' as const, overlapFrac: 0.5 };
    const turns = [turn('R', 'remote', 0, 6, tag), turn('Q', 'remote', 3, 9, tag)];
    const kept = score(turns, [seg('system', 'eerste spreker zegt iets', 0, 3), seg('system', 'tweede spreker zegt wat', 3.2, 9)]);
    expect(kept.pairs[0]).toMatchObject({ bothKept: true, merged: false, echoMarked: false });
    const merged = score(turns, [seg('system', 'beide sprekers in een regel', 0, 9)]);
    expect(merged.pairs[0]).toMatchObject({ bothKept: false, merged: true });
    const lr = [turn('R', 'remote', 0, 6, { ...tag, pairing: 'local+remote' }), turn('L', 'local', 3, 9, { ...tag, pairing: 'local+remote' })];
    const echoed = score(lr, [seg('system', 'remote zin hier', 0, 6), seg('mic', 'lokale zin hier', 3, 9, false)]);
    expect(echoed.pairs[0]).toMatchObject({ bothKept: false, echoMarked: true });
  });

  it('flags kept mic text that matches no local turn and no remote line as junk', () => {
    const s = score([turn('R', 'remote', 0, 5)], [seg('system', 'een zin van remote', 0, 5), seg('mic', 'volledig andere woorden hier', 20, 24)]);
    expect(s.junkMicLines).toBe(1);
  });
});
