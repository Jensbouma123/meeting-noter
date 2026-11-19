import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CorpusEntry } from '../types/corpus-entry';
import type { Utterance } from '../types/utterance';
import { MEETINGS_PER_SPLIT, buildMeetings } from './meeting-plan';
import { speakerSplit } from './meeting-speakers';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../corpus-manifest.json'), 'utf8')) as CorpusEntry[];
const utts: Utterance[] = manifest.map((e) => ({ id: e.id, speaker: e.speaker, seconds: e.seconds, split: 'dev', audio: new Float32Array(0) }));
const meetings = buildMeetings(utts);
const real = (m: (typeof meetings)[number]) => m.turns.filter((t) => t.event !== 'backchannel');

describe('meeting plan', () => {
  it('has at least 60 unique meetings, split by speaker', () => {
    expect(meetings.length).toBe(2 * MEETINGS_PER_SPLIT);
    expect(new Set(meetings.map((m) => m.id)).size).toBe(meetings.length);
    expect(meetings.every((m) => m.speakers.every((s) => speakerSplit(s.id) === m.split))).toBe(true);
  });

  it('has 4-6 distinct speakers, 1-2 local, 2-4 minutes, all languages', () => {
    for (const m of meetings) {
      expect(m.speakers.length).toBeGreaterThanOrEqual(4);
      expect(m.speakers.length).toBeLessThanOrEqual(6);
      expect(new Set(m.speakers.map((s) => s.id)).size).toBe(m.speakers.length);
      const locals = m.speakers.filter((s) => s.role === 'local').length;
      expect(locals === 1 || locals === 2).toBe(true);
      expect(m.durationSec).toBeGreaterThan(115);
      expect(m.durationSec).toBeLessThan(260);
    }
    expect(new Set(meetings.map((m) => m.lang))).toEqual(new Set(['nl', 'en', 'mixed']));
    expect(new Set(meetings.map((m) => m.speakers.length))).toEqual(new Set([4, 5, 6]));
  });

  it('overlaps different speakers in every pairing and overlap bin, in both splits', () => {
    for (const split of ['dev', 'heldout']) {
      const turns = meetings.filter((m) => m.split === split).flatMap(real).filter((t) => t.pairId !== null);
      for (const pairing of ['remote+remote', 'local+local', 'local+remote']) {
        const sel = turns.filter((t) => t.pairing === pairing);
        expect(sel.length).toBeGreaterThan(20);
        expect(sel.some((t) => t.overlapFrac! < 0.4)).toBe(true);
        expect(sel.some((t) => t.overlapFrac! >= 0.7)).toBe(true);
      }
    }
    for (const m of meetings) {
      for (const id of new Set(real(m).flatMap((t) => (t.pairId === null ? [] : [t.pairId])))) {
        const [a, b] = real(m).filter((t) => t.pairId === id);
        expect(a.speaker).not.toBe(b.speaker);
        expect(b.startSec).toBeLessThan(a.endSec);
      }
    }
  });

  it('includes backchannels and is deterministic', () => {
    expect(meetings.flatMap((m) => m.turns).filter((t) => t.event === 'backchannel').length).toBeGreaterThan(20);
    expect(buildMeetings(utts)).toEqual(meetings);
  });
});
