import { describe, expect, it } from 'vitest';
import type { MeetingCase, MeetingTurn } from '../types/meeting-case';
import type { ScoredSegment } from '../types/meeting-score';
import { formatMeetingReport } from './meeting-report';
import { scoreMeeting } from './meeting-score';

const turn = (speaker: string, role: 'local' | 'remote', s: number, e: number, extra: Partial<MeetingTurn> = {}): MeetingTurn => ({
  utt: 'x', speaker, role, lang: 'nl', event: 'turn', startSec: s, endSec: e, clipSec: null, pairId: null, pairing: null, overlapFrac: null, ...extra,
});
const seg = (source: 'mic' | 'system', text: string, start: number, end: number, kept = true, label?: string): ScoredSegment =>
  label === undefined ? { source, text, start, end, kept } : { source, text, start, end, kept, label };
const meeting = (turns: MeetingTurn[]): MeetingCase => ({
  id: 'm', split: 'dev', lang: 'nl', bleed: null, turns, durationSec: 30,
  speakers: [{ id: 'L', role: 'local', lang: 'nl' }, { id: 'R', role: 'remote', lang: 'nl' }],
});
const score = (turns: MeetingTurn[], segments: ScoredSegment[]) => scoreMeeting(meeting(turns), { id: 'm', split: 'dev', segments });

describe('scoreMeeting (source-column mode without labels)', () => {
  it('counts a surviving mic twin as a duplicate line and a phantom speaker', () => {
    const s = score(
      [turn('R', 'remote', 0, 5), turn('L', 'local', 8, 12)],
      [seg('system', 'dit is een test zin', 0, 5), seg('mic', 'dit is een test zin', 0.3, 5.2), seg('mic', 'ja precies dat klopt', 8, 12)],
    );
    expect(s.labeled).toBe(false);
    expect(s.turns[0].dups).toBe(1);
    expect(s.turns[0].attributed).toBeNull();
    expect(s.phantomSpeakers).toBe(1);
    expect(s.truthSpeakers).toBe(2);
    expect(s.shownSpeakers).toBe(3);
  });

  it('counts a heard but dropped local line as lost and unheard as neither', () => {
    const s = score([turn('L', 'local', 0, 4), turn('R', 'remote', 6, 10)], [seg('mic', 'een echte lokale zin', 0, 4, false)]);
    expect(s.turns[0]).toMatchObject({ heard: true, kept: false, lost: true, attributed: null });
    expect(s.turns[1]).toMatchObject({ heard: false, lost: false, attributed: null });
    expect(s.lostSpeakers).toBe(2);
  });

  it('scores a crosstalk pair as both kept, merged or echo-marked', () => {
    const tag = { pairId: 0, pairing: 'remote+remote' as const, overlapFrac: 0.5 };
    const turns = [turn('R', 'remote', 0, 6, tag), turn('Q', 'remote', 3, 9, tag)];
    const kept = score(turns, [seg('system', 'eerste spreker zegt iets', 0, 3), seg('system', 'tweede spreker zegt wat', 3.2, 9)]);
    expect(kept.pairs[0]).toMatchObject({ bothKept: true, bothAttributed: null, merged: false, echoMarked: false });
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

describe('scoreMeeting (diarization-aware mode with labels)', () => {
  it('scores perfect diarization across overlapping same-source and cross-source turns', () => {
    const rr = { pairId: 0, pairing: 'remote+remote' as const, overlapFrac: 0.67 };
    const lr = { pairId: 1, pairing: 'local+remote' as const, overlapFrac: 0.5 };
    const turns = [
      turn('R1', 'remote', 0, 6, rr), turn('R2', 'remote', 2, 8, { ...rr, lang: 'en' }),
      turn('L1', 'local', 12, 18, lr), turn('R1', 'remote', 15, 21, lr),
    ];
    const s = score(turns, [
      seg('system', 'eerste spreker praat nu', 0, 6, true, 'system:2'),
      seg('system', 'second speaker talks too', 2, 8, true, 'system:0'),
      seg('mic', 'lokale spreker zegt wat', 12, 18, true, 'mic:1'),
      seg('system', 'eerste spreker nog eens', 15, 21, true, 'system:2'),
    ]);
    expect(s.labeled).toBe(true);
    expect(s.labelMap).toEqual({ 'system:2': 'R1', 'system:0': 'R2', 'mic:1': 'L1' });
    expect(s).toMatchObject({ truthSpeakers: 3, shownSpeakers: 3, phantomSpeakers: 0, lostSpeakers: 0, mergedLines: 0 });
    expect(s.turns.every((t) => t.attributed && t.kept && !t.lost && !t.merged)).toBe(true);
    expect(s.pairs.every((p) => p.bothKept && p.bothAttributed && !p.merged && !p.echoMarked)).toBe(true);
  });

  it('flags a swapped label while keeping optimal one-to-one speaker assignment', () => {
    const turns = [
      turn('R1', 'remote', 0, 6), turn('R1', 'remote', 10, 14),
      turn('R2', 'remote', 20, 26), turn('R2', 'remote', 30, 34),
    ];
    const s = score(turns, [
      seg('system', 'eerste beurt spreker een', 0, 6, true, 'system:0'),
      seg('system', 'tweede beurt verwisseld label', 10, 14, true, 'system:1'),
      seg('system', 'eerste beurt spreker twee', 20, 26, true, 'system:1'),
      seg('system', 'tweede beurt spreker twee', 30, 34, true, 'system:1'),
    ]);
    expect(s.labelMap).toEqual({ 'system:0': 'R1', 'system:1': 'R2' });
    expect(s.turns.map((t) => t.attributed)).toEqual([true, false, true, true]);
    expect(s).toMatchObject({ truthSpeakers: 2, shownSpeakers: 2, phantomSpeakers: 0, lostSpeakers: 0, mergedLines: 0 });
  });

  it('uses optimal (non-greedy) assignment when greedy overlap would leave a speaker unmatched', () => {
    const turns = [turn('R1', 'remote', 0, 6), turn('R1', 'remote', 10, 14), turn('R2', 'remote', 20, 25)];
    const s = score(turns, [
      seg('system', 'lang stuk van een', 0, 6, true, 'system:0'),
      seg('system', 'stukje van spreker twee', 20, 25, true, 'system:0'),
      seg('system', 'tweede stuk spreker een', 10, 14, true, 'system:1'),
    ]);
    expect(s.labelMap).toEqual({ 'system:0': 'R2', 'system:1': 'R1' });
    expect(s).toMatchObject({ truthSpeakers: 2, shownSpeakers: 2, phantomSpeakers: 0, lostSpeakers: 0 });
  });

  it('detects a merged overlap line covering two truth speakers', () => {
    const tag = { pairId: 0, pairing: 'local+local' as const, overlapFrac: 0.67 };
    const turns = [turn('L1', 'local', 0, 6, tag), turn('L2', 'local', 2, 8, tag)];
    const s = score(turns, [seg('mic', 'twee lokale sprekers in een regel', 0, 8, true, 'mic:0')]);
    expect(s).toMatchObject({ truthSpeakers: 2, shownSpeakers: 1, phantomSpeakers: 0, lostSpeakers: 1, mergedLines: 1 });
    expect(s.pairs[0]).toMatchObject({ bothKept: false, bothAttributed: false, merged: true, echoMarked: false });
    expect(s.turns[0]).toMatchObject({ attributed: true, merged: true });
    expect(s.turns[1]).toMatchObject({ attributed: false, merged: true });
  });

  it('counts phantom speakers for both an unmatched bleed label and an over-split speaker', () => {
    const turns = [turn('R1', 'remote', 0, 6), turn('R1', 'remote', 10, 14), turn('L1', 'local', 20, 25)];
    const s = score(turns, [
      seg('system', 'eerste zin van remote', 0, 6, true, 'system:0'),
      seg('system', 'tweede zin gesplitst label', 10, 14, true, 'system:2'),
      seg('mic', 'eerste zin van remote', 0.2, 6.1, true, 'mic:9'),
      seg('mic', 'echte lokale zin hier', 20, 25, true, 'mic:0'),
    ]);
    expect(s.labelMap).toEqual({ 'system:0': 'R1', 'mic:0': 'L1' });
    expect(s).toMatchObject({ truthSpeakers: 2, shownSpeakers: 4, phantomSpeakers: 2, lostSpeakers: 0 });
    expect(s.turns.map((t) => t.attributed)).toEqual([true, false, true]);
  });

  it('formats diarization report breakdowns with Wilson CIs by pairing, overlap bin, and language', () => {
    const tag = { pairId: 0, pairing: 'remote+remote' as const, overlapFrac: 0.5 };
    const s = score(
      [turn('R1', 'remote', 0, 6, { ...tag, lang: 'nl' }), turn('R2', 'remote', 3, 9, { ...tag, lang: 'en' })],
      [seg('system', 'eerste nederlandse zin', 0, 6, true, 'system:0'), seg('system', 'second english line here', 3, 9, true, 'system:1')],
    );
    const md = formatMeetingReport([s], '2026-11-20T00:00:00.000Z');
    expect(md).toContain('diarization label (optimal 1-to-1 overlap assignment)');
    expect(md).toContain('### Lines by pairing');
    expect(md).toContain('### Lines by overlap fraction');
    expect(md).toContain('speaker attributed (kept)');
    expect(md).toContain('both attributed');
    expect(md).toContain('phantom speakers 0/2');
  });
});
