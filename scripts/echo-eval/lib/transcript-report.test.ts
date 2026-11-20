import { describe, expect, it } from 'vitest';
import type { MeetingCase, MeetingTurn } from '../types/meeting-case';
import type { ScoredMeetingResult } from '../types/meeting-score';
import { scoreMeeting } from './meeting-score';
import { transcriptInputs, transcriptSection } from './transcript-report';

const turn = (speaker: string, s: number, e: number, refText?: string): MeetingTurn => ({
  utt: '', speaker, role: 'remote', lang: 'en', event: 'turn', startSec: s, endSec: e, clipSec: null, pairId: null, pairing: null, overlapFrac: null, refText,
});
const meeting = (turns: MeetingTurn[]): MeetingCase => ({
  id: 'ext', split: 'heldout', lang: 'en', bleed: null, turns, durationSec: 10,
  speakers: [{ id: 'A', role: 'remote', lang: 'en' }, { id: 'B', role: 'remote', lang: 'en' }],
});
const result: ScoredMeetingResult = {
  id: 'ext', split: 'heldout', segments: [
    { source: 'system', text: 'good morning everyone', start: 0, end: 4, kept: true, label: '1' },
    { source: 'system', text: 'hi there', start: 4, end: 8, kept: true, label: '2' },
    { source: 'mic', text: 'hi there', start: 4, end: 8, kept: true, label: '9' },
    { source: 'system', text: 'dropped words', start: 8, end: 9, kept: false, label: '2' },
  ],
};

describe('transcript report', () => {
  const c = meeting([turn('A', 0, 4, 'Good morning, everyone.'), turn('B', 4, 8, 'Hi there!')]);
  const s = scoreMeeting(c, result);

  it('keeps only kept lines of the reference source and maps their labels', () => {
    const { segs, labelMap } = transcriptInputs(c, result, s);
    expect(segs.map((x) => x.text)).toEqual(['good morning everyone', 'hi there']);
    expect(labelMap).toEqual({ 'system:1': 'A', 'system:2': 'B' });
  });

  it('adds a transcript section only for cases with reference text', () => {
    const md = transcriptSection(new Map([[c.id, c]]), [result], [s]).join('\n');
    expect(md).toContain('| ext | 0.0% (0/5) | 0.0% |');
    expect(md).toContain('| ext | B | system:2 | 0.0% (0/2) |');
    const bare = meeting([turn('A', 0, 4), turn('B', 4, 8)]);
    expect(transcriptSection(new Map([[bare.id, bare]]), [result], [scoreMeeting(bare, result)])).toEqual([]);
  });

  it('gives variants with the same reference-channel output distinct rows for mic leakage and phantoms', () => {
    const sys = { ...c, id: 'ext-system' };
    const bleed = { ...c, id: 'ext-bleed' };
    const clean: ScoredMeetingResult = { id: sys.id, split: 'heldout', segments: result.segments.filter((x) => x.source === 'system') };
    const leaky = { ...result, id: bleed.id };
    const md = transcriptSection(
      new Map([[sys.id, sys], [bleed.id, bleed]]),
      [clean, leaky],
      [scoreMeeting(sys, clean), scoreMeeting(bleed, leaky)],
    ).join('\n');
    expect(md).toContain('| ext-system | 0.0% (0/5) | 0.0% |');
    expect(md).toMatch(/\| ext-system \|.*\| 0\/2 \| 0 \(0 words\) \|/);
    expect(md).toMatch(/\| ext-bleed \|.*\| 1\/3 \| 1 \(2 words\) \|/);
  });
});
